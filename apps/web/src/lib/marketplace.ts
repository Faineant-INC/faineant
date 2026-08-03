import "server-only";

import { cache } from "react";
import type { Database } from "@faineant/shared";
import { createClient } from "@/lib/supabase/server";

type ServiceCategory = Database["public"]["Enums"]["service_category"];

export interface MarketplaceService {
  id: string;
  name: string;
  description: string | null;
  category: ServiceCategory;
  durationMinutes: number;
  priceInCents: number;
}

export interface MarketplaceProvider {
  id: string;
  slug: string;
  businessName: string | null;
  bio: string | null;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  serviceRadius: number | null;
  averageRating: number;
  totalReviews: number;
  services: MarketplaceService[];
  portfolio: {
    id: string;
    imageUrl: string;
    caption: string | null;
    serviceId: string | null;
  }[];
}

export function servicePathSegment(service: MarketplaceService): string {
  const name = service.name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${name || "service"}-${service.id.slice(0, 8)}`;
}

export const listMarketplaceProviders = cache(async (): Promise<MarketplaceProvider[]> => {
  const supabase = await createClient();
  const { data: providerRows, error: providerError } = await supabase.rpc(
    "search_providers",
    { p_limit: 100, p_offset: 0 },
  );
  if (providerError) throw new Error(providerError.message);

  const providers = (providerRows ?? []).flatMap((provider) =>
    provider.id && provider.slug
      ? [{
          id: provider.id,
          slug: provider.slug,
          businessName: provider.business_name,
          bio: provider.bio,
          firstName: provider.first_name ?? "",
          lastName: provider.last_name ?? "",
          avatarUrl: provider.avatar_url,
          serviceRadius: provider.service_radius,
          averageRating: provider.average_rating ?? 0,
          totalReviews: provider.total_reviews ?? 0,
        }]
      : [],
  );
  const providerIds = providers.map((provider) => provider.id);

  if (providerIds.length === 0) return [];

  const [serviceResult, portfolioResult] = await Promise.all([
    supabase
      .from("services")
      .select(
        "id,provider_profile_id,name,description,category,duration_minutes,price_in_cents",
      )
      .in("provider_profile_id", providerIds)
      .eq("is_active", true)
      .order("price_in_cents"),
    supabase
      .from("portfolio_items")
      .select("id,provider_profile_id,service_id,image_url,caption,sort_order")
      .in("provider_profile_id", providerIds)
      .order("sort_order"),
  ]);
  if (serviceResult.error) throw new Error(serviceResult.error.message);
  if (portfolioResult.error) throw new Error(portfolioResult.error.message);

  return providers.map((provider) => ({
    ...provider,
    services: (serviceResult.data ?? [])
      .filter((service) => service.provider_profile_id === provider.id)
      .map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        category: service.category,
        durationMinutes: service.duration_minutes,
        priceInCents: service.price_in_cents,
      })),
    portfolio: (portfolioResult.data ?? [])
      .filter((item) => item.provider_profile_id === provider.id)
      .map((item) => ({
        id: item.id,
        imageUrl: item.image_url,
        caption: item.caption,
        serviceId: item.service_id,
      })),
  }));
});

export async function getMarketplaceProvider(
  slug: string,
): Promise<MarketplaceProvider | null> {
  const providers = await listMarketplaceProviders();
  return providers.find((provider) => provider.slug === slug) ?? null;
}

export async function getMarketplaceService(segment: string): Promise<{
  provider: MarketplaceProvider;
  service: MarketplaceService;
} | null> {
  const providers = await listMarketplaceProviders();
  for (const provider of providers) {
    const service = provider.services.find(
      (candidate) =>
        candidate.id === segment || servicePathSegment(candidate) === segment,
    );
    if (service) return { provider, service };
  }
  return null;
}
