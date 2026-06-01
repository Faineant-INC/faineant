import { prisma } from "../config/database";
import { boundingBox, distanceMiles } from "../utils/geo";
import { ServiceCategory } from "@faineant/shared";

interface SearchParams {
  latitude?: number;
  longitude?: number;
  radiusMiles?: number;
  category?: ServiceCategory;
  query?: string;
  page?: number;
  pageSize?: number;
}

export async function searchProviders(params: SearchParams) {
  const { latitude, longitude, radiusMiles = 25, category, query, page = 1, pageSize = 20 } = params;

  const where: Record<string, unknown> = {
    user: { isActive: true },
  };

  // Location filter using bounding box
  if (latitude !== undefined && longitude !== undefined) {
    const bbox = boundingBox(latitude, longitude, radiusMiles);
    where.latitude = { gte: bbox.minLat, lte: bbox.maxLat };
    where.longitude = { gte: bbox.minLng, lte: bbox.maxLng };
  }

  // Category filter
  if (category) {
    where.services = { some: { category, isActive: true } };
  }

  // Text search
  if (query) {
    where.OR = [
      { businessName: { contains: query, mode: "insensitive" } },
      { bio: { contains: query, mode: "insensitive" } },
      { user: { firstName: { contains: query, mode: "insensitive" } } },
      { user: { lastName: { contains: query, mode: "insensitive" } } },
    ];
  }

  const [providers, total] = await Promise.all([
    prisma.providerProfile.findMany({
      where: where as NonNullable<Parameters<typeof prisma.providerProfile.findMany>[0]>["where"],
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true } },
        services: { where: { isActive: true }, select: { name: true, category: true, priceInCents: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { averageRating: "desc" },
    }),
    prisma.providerProfile.count({
      where: where as NonNullable<Parameters<typeof prisma.providerProfile.count>[0]>["where"],
    }),
  ]);

  // If location provided, compute actual distance and sort by it
  let results = providers.map((p) => ({
    ...p,
    distance:
      latitude !== undefined && longitude !== undefined && p.latitude && p.longitude
        ? distanceMiles(latitude, longitude, p.latitude, p.longitude)
        : null,
  }));

  if (latitude !== undefined && longitude !== undefined) {
    results = results
      .filter((p) => p.distance === null || p.distance <= radiusMiles)
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }

  return {
    items: results,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getProviderBySlug(slug: string) {
  return prisma.providerProfile.findUnique({
    where: { slug },
    include: {
      user: { select: { firstName: true, lastName: true, avatarUrl: true } },
      services: { where: { isActive: true } },
      portfolioItems: { orderBy: { sortOrder: "asc" } },
      reviews: {
        include: {
          client: { select: { firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
}
