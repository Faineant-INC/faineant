interface ServiceImageSource {
  id: string;
  category: string;
}

interface ProviderImageSource {
  avatarUrl: string | null;
  services: { category: string }[];
  portfolio: {
    imageUrl: string;
    serviceId: string | null;
  }[];
}

export const MARKETPLACE_CATEGORY_IMAGES: Record<string, string> = {
  HAIRCUT: "/brand/photography/tile-hair.png",
  FADE: "/brand/photography/tile-barber.png",
  BEARD: "/brand/photography/tile-barber.png",
  BRAIDS: "/brand/photography/tile-hair.png",
  LOCS: "/brand/photography/tile-hair.png",
  COLOR: "/brand/photography/tile-hair.png",
  NAILS: "/brand/photography/tile-nails.png",
  BROWS: "/brand/photography/tile-face.png",
  FACIAL: "/brand/photography/tile-face.png",
  LASHES: "/brand/photography/tile-lash.png",
  WAXING: "/brand/photography/tile-face.png",
  MAKEUP: "/brand/photography/tile-makeup.png",
  OTHER: "/brand/photography/portrait-maeve.png",
};

const BRAND_MARK_PATH =
  /\/brand\/(?:logos\/)?faineant-(?:logo|wordmark|monogram)(?:[-./]|$)/i;

export function isMarketplacePhotography(
  imageUrl: string | null | undefined,
): imageUrl is string {
  if (!imageUrl) return false;

  try {
    const pathname = new URL(imageUrl, "https://faineant.invalid").pathname;
    return !BRAND_MARK_PATH.test(pathname);
  } catch {
    return !BRAND_MARK_PATH.test(imageUrl);
  }
}

export function resolveServiceImage(
  provider: ProviderImageSource,
  service: ServiceImageSource,
): string {
  const serviceImage = provider.portfolio.find(
    (item) => item.serviceId === service.id,
  )?.imageUrl;

  return (
    [
      serviceImage,
      MARKETPLACE_CATEGORY_IMAGES[service.category],
      provider.avatarUrl,
      provider.portfolio[0]?.imageUrl,
      MARKETPLACE_CATEGORY_IMAGES.OTHER,
    ].find(isMarketplacePhotography) ?? MARKETPLACE_CATEGORY_IMAGES.OTHER
  );
}

export function resolveProviderImage(provider: ProviderImageSource): string {
  const portfolioImage = provider.portfolio.find((item) =>
    isMarketplacePhotography(item.imageUrl),
  )?.imageUrl;
  const categoryImage =
    MARKETPLACE_CATEGORY_IMAGES[provider.services[0]?.category ?? "OTHER"];

  return (
    [
      provider.avatarUrl,
      portfolioImage,
      categoryImage,
      MARKETPLACE_CATEGORY_IMAGES.OTHER,
    ].find(isMarketplacePhotography) ?? MARKETPLACE_CATEGORY_IMAGES.OTHER
  );
}
