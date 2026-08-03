import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getMarketplaceService } from "@/lib/marketplace";
import { createClient } from "@/lib/supabase/server";

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

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function clock(value: string): string {
  const [hour = "0", minute = "00"] = value.split(":");
  const date = new Date(2000, 0, 1, Number(hour), Number(minute));
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getMarketplaceService(slug);
  if (!result) notFound();
  const { provider, service } = result;

  const supabase = await createClient();
  const { data: schedule, error: scheduleError } = await supabase
    .from("availability")
    .select("id,day_of_week,start_time,end_time")
    .eq("provider_profile_id", provider.id)
    .order("day_of_week")
    .order("start_time");
  if (scheduleError) throw new Error(scheduleError.message);

  const image =
    provider.portfolio.find((item) => item.serviceId === service.id)?.imageUrl ??
    CATEGORY_IMAGES[service.category] ??
    provider.avatarUrl ??
    provider.portfolio[0]?.imageUrl;
  const providerName =
    `${provider.firstName} ${provider.lastName}`.trim() ||
    provider.businessName ||
    "Faineant practitioner";

  return (
    <>
      <Topbar />
      <SiteHeader />
      <main className="max-w-[1480px] mx-auto px-5 md:px-10 lg:px-14 py-10 md:py-14 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-14">
        <div className="aspect-[4/5] relative bg-smoke-900 border border-smoke-700 overflow-hidden">
          <Image
            src={image}
            alt={service.name}
            fill
            className="object-cover object-center"
            sizes="(max-width: 1024px) 100vw, 55vw"
          />
          <div className="absolute bottom-0 inset-x-0 p-4.5 bg-gradient-to-t from-black/85 to-transparent font-editorial italic text-body-sm text-bone-200 z-10">
            {service.name}, performed at home by {providerName}.
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div>
            <span className="text-label uppercase tracking-[0.32em] text-taupe-300 font-medium block mb-3.5">
              {service.category.replaceAll("_", " ")} · Chicago house call
            </span>
            <h1 className="font-display display-compressed text-[clamp(32px,7vw,46px)] leading-[1.02] text-bone-100">
              {service.name}
              <em className="font-editorial italic font-light text-champagne-400">
                .
              </em>
            </h1>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 font-mono text-mono text-taupe-300 pb-4 border-b border-smoke-700">
            <span>{service.durationMinutes} MINUTES · IN-HOME</span>
            <span className="font-display font-medium text-[1.5rem] text-champagne-400 tracking-[-0.01em]">
              {money(service.priceInCents)}
            </span>
          </div>
          <p className="font-editorial italic font-light text-body-lg text-bone-200 leading-relaxed">
            {service.description ??
              "A private appointment with the practitioner at your address."}
          </p>
          <div className="py-5 border-t border-b border-smoke-700 flex flex-col gap-2.5">
            <div className="flex justify-between items-center text-body-sm text-bone-200 gap-6">
              <span className="text-label uppercase tracking-[0.18em] text-taupe-300 font-medium text-[11px]">
                Practitioner
              </span>
              <Link
                href={`/providers/${provider.slug}`}
                className="text-right hover:text-champagne-400"
              >
                {providerName}
              </Link>
            </div>
            <div className="flex justify-between items-center text-body-sm text-bone-200 gap-6">
              <span className="text-label uppercase tracking-[0.18em] text-taupe-300 font-medium text-[11px]">
                Service area
              </span>
              <span>Chicago · up to {provider.serviceRadius ?? "—"} miles</span>
            </div>
          </div>
          <div>
            <span className="text-label uppercase tracking-[0.32em] text-taupe-300 font-medium block mb-2">
              Regular weekly hours
            </span>
            <div className="flex flex-col gap-2">
              {(schedule ?? []).length === 0 ? (
                <p className="border border-smoke-700 p-4 font-editorial italic text-bone-200">
                  Ask the practitioner for their next opening.
                </p>
              ) : (
                (schedule ?? []).map((window) => (
                  <div
                    key={window.id}
                    className="grid grid-cols-[1fr_auto] gap-4 items-center p-3.5 px-4 border border-smoke-700"
                  >
                    <span className="font-display font-medium text-[15px] text-bone-100">
                      {DAYS[window.day_of_week] ?? "Day"}
                    </span>
                    <span className="font-mono text-mono text-taupe-300">
                      {clock(window.start_time)}–{clock(window.end_time)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 md:gap-6 pt-6 border-t border-taupe-500">
            <p className="font-editorial italic text-body-lg text-bone-200">
              Exact openings account for existing bookings and connected
              calendars after sign-in.
            </p>
            <Link
              href={`/login?redirect=${encodeURIComponent(`/services/${slug}`)}`}
              className="inline-flex min-h-12 items-center justify-center bg-champagne-400 px-6 text-label uppercase tracking-[0.26em] text-smoke-900 font-medium"
            >
              Sign in · {money(service.priceInCents)}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
