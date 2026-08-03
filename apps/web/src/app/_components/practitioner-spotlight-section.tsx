import Image from "next/image";
import Link from "next/link";
import { listMarketplaceProviders } from "@/lib/marketplace";

const CATEGORY_IMAGES: Record<string, string> = {
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

export async function PractitionerSpotlightSection() {
  const providers = await listMarketplaceProviders();
  const provider = providers[0];

  return (
    <section className="py-16 md:py-24 lg:py-30 border-b border-smoke-700">
      <div className="max-w-[1480px] mx-auto px-5 md:px-10 lg:px-14">
        <div className="flex justify-between items-start md:items-end mb-10 md:mb-16 pb-6 border-b border-taupe-500 gap-6 md:gap-12 flex-col md:flex-row">
          <h3 className="font-display display-compressed text-[clamp(40px,8vw,64px)] leading-[0.94] text-bone-100">
            <em className="font-editorial italic font-light text-champagne-400">
              The Salon
            </em>{" "}
            at home.
          </h3>
          <div className="font-mono text-mono text-taupe-300 leading-relaxed text-left md:text-right">
            <strong className="text-bone-100 font-medium">
              {providers.length.toString().padStart(2, "0")} VERIFIED PRACTITIONERS
            </strong>
            <br />
            CHICAGO ONLY
            <br />
            APPLICATIONS REVIEWED
            <br />
            WAITLIST OPEN
          </div>
        </div>
        {provider ? (
          <Link
            href={`/providers/${provider.slug}`}
            className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] border border-smoke-700 lg:min-h-[560px] group"
          >
            <div className="relative bg-smoke-900 overflow-hidden min-h-[320px] sm:min-h-[420px] lg:min-h-0">
              <Image
                src={
                  provider.avatarUrl ??
                  provider.portfolio[0]?.imageUrl ??
                  CATEGORY_IMAGES[provider.services[0]?.category ?? "OTHER"]
                }
                alt={`${provider.firstName} ${provider.lastName}`.trim() || provider.businessName || "Faineant practitioner"}
                fill
                className="object-cover object-top transition-transform duration-[600ms] group-hover:scale-[1.02]"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div className="p-8 sm:p-12 lg:p-16 lg:px-14 flex flex-col justify-between gap-6 lg:gap-0 bg-smoke-900">
              <span className="text-label uppercase tracking-[0.32em] text-taupe-300 font-medium">
                In Practice · Verified
              </span>
              <h3 className="font-display display-compressed text-[clamp(36px,8vw,60px)] leading-[0.95] text-bone-100 mt-4 lg:mt-6">
                {provider.firstName || provider.businessName}{" "}
                <em className="font-editorial italic font-light text-champagne-400">
                  {provider.lastName ? `${provider.lastName}.` : ""}
                </em>
              </h3>
              <p className="font-editorial italic font-light text-[19px] sm:text-[22px] lg:text-[24px] leading-snug text-bone-200 my-4 lg:my-8 max-w-[480px]">
                &ldquo;{provider.bio ?? "A Chicago practitioner approved for private house calls."}&rdquo;
              </p>
              <dl className="grid grid-cols-3 gap-4 sm:gap-8 pt-6 border-t border-taupe-500">
                <div>
                  <dt className="text-label uppercase tracking-[0.3em] text-taupe-300 mb-1.5 font-medium">
                    Services
                  </dt>
                  <dd className="font-editorial italic text-body-sm sm:text-body-lg text-bone-100">
                    {provider.services.length}
                  </dd>
                </div>
                <div>
                  <dt className="text-label uppercase tracking-[0.3em] text-taupe-300 mb-1.5 font-medium">
                    Rating
                  </dt>
                  <dd className="font-editorial italic text-body-sm sm:text-body-lg text-bone-100">
                    {provider.totalReviews > 0
                      ? provider.averageRating.toFixed(2)
                      : "New"}
                  </dd>
                </div>
                <div>
                  <dt className="text-label uppercase tracking-[0.3em] text-taupe-300 mb-1.5 font-medium">
                    Radius
                  </dt>
                  <dd className="font-editorial italic text-body-sm sm:text-body-lg text-bone-100">
                    {provider.serviceRadius ? `${provider.serviceRadius} mi` : "Ask"}
                  </dd>
                </div>
              </dl>
            </div>
          </Link>
        ) : (
          <div className="border border-smoke-700 px-6 py-20 text-center font-editorial italic text-body-lg text-bone-200">
            Practitioner profiles are under review.
          </div>
        )}
      </div>
    </section>
  );
}
