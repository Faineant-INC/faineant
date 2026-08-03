import Image from "next/image";
import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { listMarketplaceProviders } from "@/lib/marketplace";
import { resolveProviderImage } from "@/lib/marketplace-image";

export const metadata = {
  title: "The Salon — FAINEANT",
  description: "Verified Chicago practitioners available for house calls.",
};

function categoryLabel(value: string): string {
  return value.toLowerCase().replaceAll("_", " ");
}

export default async function ProvidersPage() {
  const providers = await listMarketplaceProviders();

  return (
    <>
      <Topbar />
      <SiteHeader />
      <main className="bg-smoke-900 text-bone-100">
        <section className="max-w-[1480px] mx-auto px-5 md:px-10 lg:px-14 py-16 md:py-24 border-b border-smoke-700">
          <span className="text-label uppercase tracking-[0.32em] text-taupe-300 font-medium">
            № 02 · The Directory
          </span>
          <h1 className="font-display display-compressed text-[clamp(48px,10vw,80px)] leading-[0.94] text-bone-100 mt-4">
            The{" "}
            <em className="font-editorial italic font-light text-champagne-400">
              Salon.
            </em>
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-start md:items-end gap-6 md:gap-8 mt-10 pt-8 border-t border-taupe-500">
            <p className="font-editorial italic font-light text-[clamp(18px,3vw,24px)] leading-snug text-bone-200 max-w-[680px]">
              Every practitioner shown here has been approved for the public
              marketplace. Open a profile to see their live service menu.
            </p>
            <p className="font-mono text-mono uppercase tracking-[0.3em] text-taupe-300 text-left md:text-right">
              Chicago only
              <br />
              Currently shown · {providers.length}
            </p>
          </div>
        </section>

        <section className="max-w-[1480px] mx-auto px-5 md:px-10 lg:px-14 py-16 md:py-20">
          {providers.length === 0 ? (
            <div className="border border-smoke-700 px-6 py-20 text-center">
              <p className="font-editorial italic text-[clamp(20px,4vw,28px)] text-bone-200">
                The next approved practitioner will appear here.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-l border-t border-smoke-700">
              {providers.map((provider, index) => {
                const image = resolveProviderImage(provider);
                const specialties = [
                  ...new Set(provider.services.map((service) => categoryLabel(service.category))),
                ];
                return (
                  <li
                    key={provider.id}
                    className="border-r border-b border-smoke-700 group bg-smoke-900"
                  >
                    <Link
                      href={`/providers/${provider.slug}`}
                      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne-400"
                    >
                      <div className="relative aspect-[4/5] overflow-hidden bg-smoke-950">
                        <Image
                          src={image}
                          alt={`${provider.firstName} ${provider.lastName}`.trim() || provider.businessName || "Faineant practitioner"}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover object-top transition-transform duration-[600ms] ease-fai-smooth group-hover:scale-[1.03]"
                        />
                      </div>
                      <div className="p-6 sm:p-8 flex flex-col gap-4">
                        <span className="font-mono text-mono uppercase tracking-[0.3em] text-taupe-300">
                          № {(index + 1).toString().padStart(2, "0")} · Chicago
                        </span>
                        <h3 className="font-display display-compressed text-[clamp(28px,5vw,36px)] leading-[0.95] text-bone-100">
                          {provider.firstName || provider.businessName}{" "}
                          <em className="font-editorial italic font-light text-champagne-400">
                            {provider.lastName ? `${provider.lastName}.` : ""}
                          </em>
                        </h3>
                        <p className="font-editorial italic text-body-lg text-bone-200">
                          {specialties.length > 0
                            ? specialties.join(" · ")
                            : "Service menu coming soon"}
                        </p>
                        <span className="mt-4 pt-4 border-t border-smoke-700 text-label uppercase tracking-[0.32em] text-bone-100 group-hover:text-champagne-400 transition-colors duration-[250ms] ease-fai-smooth font-medium">
                          View menu →
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
