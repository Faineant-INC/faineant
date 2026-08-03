import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import {
  getMarketplaceProvider,
  servicePathSegment,
} from "@/lib/marketplace";
import { resolveProviderImage } from "@/lib/marketplace-image";

function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function PractitionerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const provider = await getMarketplaceProvider(slug);
  if (!provider) notFound();

  const name = `${provider.firstName} ${provider.lastName}`.trim();
  const image = resolveProviderImage(provider);
  const rating =
    provider.totalReviews > 0
      ? `${provider.averageRating.toFixed(2)} / 5`
      : "New to the salon";

  return (
    <>
      <Topbar />
      <SiteHeader />
      <main className="max-w-[1480px] mx-auto px-5 md:px-10 lg:px-14 py-16 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] lg:min-h-[680px] border border-smoke-700">
          <div className="relative bg-smoke-900 overflow-hidden min-h-[420px] sm:min-h-[520px] lg:min-h-0">
            <Image
              src={image}
              alt={name || provider.businessName || "Faineant practitioner"}
              fill
              className="object-cover object-top"
              sizes="(max-width: 1024px) 100vw, 55vw"
            />
            {provider.bio && (
              <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-10">
                <p className="font-editorial italic font-light text-[clamp(18px,3vw,24px)] text-bone-100 leading-snug">
                  &ldquo;{provider.bio}&rdquo;
                </p>
              </div>
            )}
          </div>
          <div className="bg-smoke-900 p-6 sm:p-10 lg:p-14 pb-8 flex flex-col gap-6">
            <span className="text-label uppercase tracking-[0.32em] text-taupe-300 font-medium">
              Verified practitioner · Chicago
            </span>
            <h1 className="font-display display-compressed text-[clamp(40px,9vw,64px)] leading-[0.94] text-bone-100">
              {provider.firstName || provider.businessName}{" "}
              <em className="font-editorial italic font-light text-champagne-400">
                {provider.lastName ? `${provider.lastName}.` : ""}
              </em>
            </h1>
            {provider.businessName && provider.businessName !== name && (
              <p className="font-mono text-mono uppercase tracking-[0.24em] text-champagne-400">
                {provider.businessName}
              </p>
            )}
            <p className="font-editorial italic font-light text-body-lg text-bone-200 leading-relaxed max-w-[520px]">
              {provider.bio ?? "This practitioner is preparing their public introduction."}
            </p>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 py-6 border-t border-smoke-700 border-b border-smoke-700">
              <div>
                <dt className="text-label uppercase tracking-[0.3em] text-taupe-300 mb-1.5 font-medium">
                  Rating
                </dt>
                <dd className="font-editorial italic text-body-lg text-bone-100 leading-snug">
                  {rating}
                </dd>
              </div>
              <div>
                <dt className="text-label uppercase tracking-[0.3em] text-taupe-300 mb-1.5 font-medium">
                  Reviews
                </dt>
                <dd className="font-editorial italic text-body-lg text-bone-100 leading-snug">
                  {provider.totalReviews}
                </dd>
              </div>
              <div>
                <dt className="text-label uppercase tracking-[0.3em] text-taupe-300 mb-1.5 font-medium">
                  House-call radius
                </dt>
                <dd className="font-editorial italic text-body-lg text-bone-100 leading-snug">
                  {provider.serviceRadius ? `${provider.serviceRadius} mi` : "Ask directly"}
                </dd>
              </div>
            </dl>
            <div className="flex flex-col gap-2">
              <h2 className="text-label uppercase tracking-[0.3em] text-taupe-300 mb-2 font-medium">
                {provider.firstName || "Practitioner"}&apos;s live menu
              </h2>
              {provider.services.length === 0 ? (
                <p className="border border-smoke-700 p-4 font-editorial italic text-bone-200">
                  No bookable services are published yet.
                </p>
              ) : (
                provider.services.map((service) => (
                  <Link
                    key={service.id}
                    href={`/services/${servicePathSegment(service)}`}
                    className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] gap-3 sm:gap-4 items-center p-4 px-4 border border-smoke-700 hover:border-champagne-400 transition-colors"
                  >
                    <span className="font-display font-medium text-bone-100 tracking-[-0.01em]">
                      {service.name}
                      <small className="block font-editorial italic font-light text-bone-200 text-[13px] mt-0.5">
                        {service.description ?? "In-home appointment"}
                      </small>
                    </span>
                    <span className="hidden sm:inline font-mono text-mono text-taupe-300 tracking-[0.04em]">
                      {service.durationMinutes} MIN
                    </span>
                    <span className="font-mono text-[14px] text-champagne-400 font-medium">
                      {money(service.priceInCents)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
