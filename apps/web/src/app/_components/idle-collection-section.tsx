import Image from "next/image";
import Link from "next/link";
import {
  listMarketplaceProviders,
  servicePathSegment,
} from "@/lib/marketplace";
import { resolveServiceImage } from "@/lib/marketplace-image";

function dollars(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export async function IdleCollectionSection() {
  const providers = await listMarketplaceProviders();
  const services = providers
    .flatMap((provider) =>
      provider.services.map((service) => ({ provider, service })),
    )
    .slice(0, 6);
  const prices = services.map(({ service }) => service.priceInCents);
  const averageMinutes = services.length
    ? Math.round(
        services.reduce((sum, item) => sum + item.service.durationMinutes, 0) /
          services.length,
      )
    : 0;

  return (
    <section className="py-16 md:py-24 lg:py-30 border-b border-smoke-700">
      <div className="max-w-[1480px] mx-auto px-5 md:px-10 lg:px-14">
        <div className="flex justify-between items-start md:items-end mb-10 md:mb-16 pb-6 border-b border-taupe-500 gap-6 md:gap-12 flex-col md:flex-row">
          <h3 className="font-display display-compressed text-[clamp(40px,8vw,64px)] leading-[0.94] text-bone-100">
            The{" "}
            <em className="font-editorial italic font-light text-champagne-400">
              Idle Collection.
            </em>
          </h3>
          <div className="font-mono text-mono text-taupe-300 leading-relaxed text-left md:text-right">
            <strong className="text-bone-100 font-medium">
              {services.length.toString().padStart(2, "0")} LIVE RITUALS
            </strong>
            <br />
            {prices.length > 0
              ? `${dollars(Math.min(...prices))} — ${dollars(Math.max(...prices))}`
              : "MENUS IN REVIEW"}
            <br />
            {averageMinutes > 0 ? `AVG · ${averageMinutes} MIN · ` : ""}CHICAGO
          </div>
        </div>
        {services.length === 0 ? (
          <div className="border border-smoke-700 px-6 py-20 text-center font-editorial italic text-body-lg text-bone-200">
            Approved service menus will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-smoke-700">
            {services.map(({ provider, service }, index) => {
              const practitioner =
                `${provider.firstName} ${provider.lastName}`.trim() ||
                provider.businessName ||
                "Faineant practitioner";
              const image = resolveServiceImage(provider, service);
              return (
                <Link
                  key={service.id}
                  href={`/services/${servicePathSegment(service)}`}
                  className="group bg-smoke-900 grid grid-cols-1 sm:grid-cols-2 sm:min-h-[380px] hover:bg-smoke-800 transition-colors duration-[350ms] ease-fai-smooth"
                >
                  <div className="relative bg-smoke-900 overflow-hidden h-56 sm:h-auto">
                    <Image
                      src={image}
                      alt={service.name}
                      fill
                      className="object-cover object-center brightness-95 contrast-[1.02]"
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw"
                    />
                  </div>
                  <div className="p-6 sm:p-8 lg:p-9 flex flex-col gap-3.5">
                    <div className="flex justify-between items-start font-mono text-mono text-taupe-300">
                      <span>
                        № {(index + 1).toString().padStart(2, "0")} ·{" "}
                        {service.category.replaceAll("_", " ")}
                      </span>
                      <span className="text-champagne-400 font-medium text-[14px]">
                        {dollars(service.priceInCents)}
                      </span>
                    </div>
                    <h4 className="font-display display-compressed text-[clamp(24px,5vw,30px)] leading-[1.04] text-bone-100 mt-1">
                      {service.name}
                      <em className="font-editorial italic font-light text-champagne-400">
                        .
                      </em>
                    </h4>
                    <p className="font-editorial italic text-body-lg text-bone-200 leading-snug">
                      {service.description ?? "A private house call, performed slowly."}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-auto pt-4 border-t border-smoke-700 text-label uppercase tracking-[0.3em] text-taupe-300 font-medium text-[10px] gap-2">
                      <span className="flex items-center gap-2.5">
                        <span className="w-4 h-4 rounded-full bg-taupe-500" aria-hidden />
                        {practitioner}
                      </span>
                      <span>{service.durationMinutes} MIN · CHICAGO</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
