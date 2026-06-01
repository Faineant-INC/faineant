import { Topbar } from "@/components/layout/topbar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { SERVICE_CATEGORIES } from "@faineant/shared";

export const metadata = {
  title: "How it works — FAINEANT",
  description:
    "You pay the practitioner directly through us. We take 5%. Cancellation is free until midnight the day before.",
};

const RULES = [
  {
    number: "№ 01",
    title: "You pay the practitioner",
    accent: "directly through us.",
    body: "The practitioner sets the price. The practitioner keeps the price. We hold the card on file, charge it after the appointment, and pass the money along the same day.",
  },
  {
    number: "№ 02",
    title: "We take",
    accent: "five per cent.",
    body: "That is the whole arrangement. No subscription, no listing fee, no boosted placements. Five per cent of the service total covers the calendar, the messaging, the payments and the small office that runs them.",
  },
  {
    number: "№ 03",
    title: "Cancellation is free",
    accent: "until midnight the day before.",
    body: "Cancel before midnight, the night before. Nothing charged. After that the practitioner has already turned down other work, and the full fee applies. We do not negotiate, and neither should you.",
  },
];

type Row = {
  category: string;
  service: string;
  duration: string;
  price: string;
};

const SAMPLE_PRICES: Record<string, Row[]> = {
  hair: [
    { category: "Hair", service: "Cut, dry style", duration: "75 min", price: "$160" },
    { category: "Hair", service: "Single-process colour", duration: "120 min", price: "$240" },
    { category: "Hair", service: "Balayage", duration: "180 min", price: "$420" },
  ],
  nails: [
    { category: "Nails", service: "Manicure, classic", duration: "45 min", price: "$70" },
    { category: "Nails", service: "Gel manicure", duration: "60 min", price: "$95" },
    { category: "Nails", service: "Pedicure", duration: "60 min", price: "$110" },
  ],
  face: [
    { category: "Face", service: "Signature facial", duration: "75 min", price: "$185" },
    { category: "Face", service: "Dermaplane facial", duration: "90 min", price: "$235" },
  ],
  lash: [
    { category: "Lash", service: "Classic full set", duration: "120 min", price: "$220" },
    { category: "Lash", service: "Volume fill", duration: "75 min", price: "$130" },
  ],
  barber: [
    { category: "Barber", service: "Cut and beard", duration: "60 min", price: "$110" },
    { category: "Barber", service: "Hot-towel shave", duration: "45 min", price: "$85" },
  ],
  makeup: [
    { category: "Makeup", service: "Day makeup", duration: "60 min", price: "$160" },
    { category: "Makeup", service: "Evening / event", duration: "75 min", price: "$210" },
  ],
};

const ALL_ROWS: Row[] = SERVICE_CATEGORIES.flatMap(
  (c) => SAMPLE_PRICES[c.slug] ?? [],
);

export default function PricingPage() {
  return (
    <>
      <Topbar />
      <SiteHeader />
      <main className="bg-smoke-900 text-bone-100">
        <section className="max-w-[1480px] mx-auto px-5 md:px-10 lg:px-14 py-16 md:py-24 border-b border-smoke-700">
          <span className="text-label uppercase tracking-[0.32em] text-taupe-300 font-medium">
            № 03 · The Arrangement
          </span>
          <h1 className="font-display display-compressed text-[clamp(48px,10vw,80px)] leading-[0.94] text-bone-100 mt-4">
            How it{" "}
            <em className="font-editorial italic font-light text-champagne-400">
              works.
            </em>
          </h1>
          <p className="font-editorial italic font-light text-[clamp(20px,4vw,28px)] leading-snug text-bone-200 mt-10 max-w-[760px]">
            Three rules. Written down once. Easy to remember.
          </p>
        </section>

        {RULES.map((r, idx) => (
          <section
            key={r.number}
            className={`max-w-[1480px] mx-auto px-5 md:px-10 lg:px-14 py-16 md:py-20 ${
              idx < RULES.length - 1 ? "border-b border-smoke-700" : "border-b border-smoke-700"
            }`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-baseline">
              <div className="lg:col-span-3 font-mono text-mono uppercase tracking-[0.3em] text-taupe-300">
                {r.number}
              </div>
              <div className="lg:col-span-6">
                <h2 className="font-display display-compressed text-[clamp(32px,7vw,48px)] leading-[0.98] text-bone-100">
                  {r.title}{" "}
                  <em className="font-editorial italic font-light text-champagne-400">
                    {r.accent}
                  </em>
                </h2>
              </div>
              <div className="lg:col-span-3">
                <p className="font-editorial italic font-light text-[clamp(16px,2.5vw,18px)] leading-relaxed text-bone-200">
                  {r.body}
                </p>
              </div>
            </div>
          </section>
        ))}

        <section className="max-w-[1480px] mx-auto px-5 md:px-10 lg:px-14 py-16 md:py-24">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-10 md:mb-12 pb-6 border-b border-taupe-500 gap-6 md:gap-12">
            <h2 className="font-display display-compressed text-[clamp(36px,8vw,60px)] leading-[0.95] text-bone-100">
              An{" "}
              <em className="font-editorial italic font-light text-champagne-400">
                honest
              </em>{" "}
              menu.
            </h2>
            <p className="font-mono text-mono uppercase tracking-[0.3em] text-taupe-300 text-left md:text-right">
              Sample pricing · Practitioners set their own
            </p>
          </div>
          <div className="border border-smoke-700">
            <div className="hidden sm:grid grid-cols-[1fr_2fr_1fr_1fr] font-mono text-mono uppercase tracking-[0.3em] text-taupe-300 px-6 py-4 border-b border-smoke-700 bg-smoke-950">
              <span>Category</span>
              <span>Service</span>
              <span>Duration</span>
              <span className="text-right">From</span>
            </div>
            {ALL_ROWS.map((row, i) => (
              <div
                key={`${row.category}-${row.service}`}
                className={`grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_2fr_1fr_1fr] gap-y-1 px-5 sm:px-6 py-4 sm:py-5 items-baseline ${
                  i < ALL_ROWS.length - 1 ? "border-b border-smoke-700" : ""
                }`}
              >
                <span className="font-mono text-mono uppercase tracking-[0.3em] text-taupe-300">
                  {row.category}
                </span>
                <span className="font-display text-[1.25rem] sm:hidden text-bone-100 text-right leading-none">
                  {row.price}
                </span>
                <span className="font-editorial italic text-body-lg text-bone-100 col-span-2 sm:col-span-1">
                  {row.service}
                </span>
                <span className="hidden sm:inline text-body-sm text-taupe-300">{row.duration}</span>
                <span className="hidden sm:inline font-display text-[1.5rem] leading-none text-bone-100 text-right">
                  {row.price}
                </span>
                <span className="sm:hidden text-body-sm text-taupe-300 col-span-2">{row.duration}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 font-editorial italic font-light text-[clamp(16px,2.5vw,18px)] text-taupe-300 max-w-[760px]">
            These are starting prices we have seen on the platform. Practitioners
            set their own rates; many charge more for longer hair, evening hours,
            or travel beyond their usual neighbourhood.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
