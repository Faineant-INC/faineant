import Image from "next/image";
import Link from "next/link";
import { CITY } from "@faineant/shared";

const FOOT_COLS = [
  {
    title: "Reserve",
    items: [
      { label: "Services", href: "/services" },
      { label: "Practitioners", href: "/practitioners" },
      { label: "Gift hours", href: "/gift" },
      { label: "House accounts", href: "/house-accounts" },
    ],
  },
  {
    title: "Studio",
    items: [
      { label: "For practitioners", href: "/for-practitioners" },
      { label: "Apply for the salon", href: "/apply" },
      { label: "Press", href: "/press" },
    ],
  },
  {
    title: "House",
    items: [
      { label: "Manifesto", href: "/manifesto" },
      { label: "Journal", href: "/journal" },
      { label: "Cancellation", href: "/cancellation" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-smoke-950 text-taupe-300 px-5 md:px-10 lg:px-14 pt-16 md:pt-24 lg:pt-30 pb-8 border-b-[6px] border-champagne-400">
      <div className="max-w-[1480px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 md:gap-12 pb-12 md:pb-20">
          <div>
            <Link href="/" className="block mb-6 md:mb-8">
              <Image
                src="/brand/faineant-wordmark-white.png"
                alt="FAINEANT"
                width={520}
                height={101}
                className="w-full max-w-[260px] sm:max-w-[420px] lg:max-w-[520px] h-auto"
              />
            </Link>
            <p className="font-editorial italic text-body-lg sm:text-editorial text-bone-200 max-w-[420px] leading-snug">
              House calls for the slow-living. {CITY}, 2026 — and only {CITY}, on purpose.
            </p>
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-8 lg:self-end">
            {FOOT_COLS.map((col) => (
              <div key={col.title}>
                <h5 className="text-label uppercase tracking-[0.32em] text-bone-100 font-medium mb-4 md:mb-5">
                  {col.title}
                </h5>
                <ul className="space-y-2.5">
                  {col.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-body-sm text-taupe-300 hover:text-champagne-400 transition-colors duration-[250ms] ease-fai-smooth"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-6 md:pt-8 font-mono text-mono text-taupe-400 border-t border-smoke-700">
          <span>© FAINEANT · 2026 · {CITY.toUpperCase()}</span>
          <span>NOTHING URGENT</span>
        </div>
      </div>
    </footer>
  );
}
