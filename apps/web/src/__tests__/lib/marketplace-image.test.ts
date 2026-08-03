import { describe, expect, it } from "vitest";
import {
  isMarketplacePhotography,
  resolveProviderImage,
  resolveServiceImage,
} from "@/lib/marketplace-image";

const haircut = { id: "service-hair", category: "HAIRCUT" };

describe("marketplace imagery", () => {
  it("uses a service-specific portfolio photograph when one exists", () => {
    const image = resolveServiceImage(
      {
        avatarUrl: null,
        services: [haircut],
        portfolio: [
          {
            imageUrl: "https://uploads.test/haircut.jpg",
            serviceId: haircut.id,
          },
        ],
      },
      haircut,
    );

    expect(image).toBe("https://uploads.test/haircut.jpg");
  });

  it("replaces a service-specific Faineant logo with category photography", () => {
    const image = resolveServiceImage(
      {
        avatarUrl: "/brand/faineant-monogram-white.png",
        services: [haircut],
        portfolio: [
          {
            imageUrl: "/brand/faineant-logo-champagne.png",
            serviceId: haircut.id,
          },
        ],
      },
      haircut,
    );

    expect(image).toBe("/brand/photography/tile-hair.png");
  });

  it("replaces provider logo placeholders with category photography", () => {
    const image = resolveProviderImage({
      avatarUrl: "/brand/logos/faineant-monogram-white.png",
      services: [{ category: "MAKEUP" }],
      portfolio: [
        {
          imageUrl: "/brand/faineant-wordmark-champagne.png",
          serviceId: null,
        },
      ],
    });

    expect(image).toBe("/brand/photography/tile-makeup.png");
  });

  it("preserves a real provider avatar", () => {
    const image = resolveProviderImage({
      avatarUrl: "https://uploads.test/provider.jpg",
      services: [{ category: "MAKEUP" }],
      portfolio: [],
    });

    expect(image).toBe("https://uploads.test/provider.jpg");
  });

  it("recognizes brand marks even when the URL has query parameters", () => {
    expect(
      isMarketplacePhotography(
        "https://faineantapp.com/brand/faineant-logo-champagne.png?v=2",
      ),
    ).toBe(false);
  });
});
