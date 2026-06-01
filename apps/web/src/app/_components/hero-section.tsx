import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CITY } from "@faineant/shared";

export function HeroSection() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 lg:min-h-[calc(100vh-84px)] border-b border-smoke-700">
      <div className="flex flex-col justify-between gap-10 lg:gap-0 p-6 sm:p-12 lg:p-20 lg:pl-14 lg:pr-14 order-2 lg:order-1">
        <div>
          <span className="block text-label uppercase tracking-[0.32em] text-taupe-300 mb-3.5">
            Idle Collection — {CITY}, 2026
          </span>
          <p className="font-editorial italic text-body-lg sm:text-editorial text-bone-200 max-w-[480px] leading-snug">
            Booking is the only thing you have to do.
          </p>
        </div>
        <h1 className="font-display display-compressed text-[clamp(40px,9vw,108px)] leading-[0.95] max-w-[680px] text-bone-100 my-2 lg:my-20">
          She{" "}
          <em className="font-editorial italic font-light tracking-[-0.02em] text-champagne-400">
            arrives at two.
          </em>
          <br />
          You don&apos;t have to.
        </h1>
        <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
          <Button asChild size="lg" variant="primary">
            <Link href="#waitlist">Reserve a window →</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/practitioners">View practitioners →</Link>
          </Button>
        </div>
        <div className="mt-8 lg:mt-16 pt-5 lg:pt-6 border-t border-taupe-500 flex flex-col sm:flex-row sm:justify-between gap-2 font-mono text-mono text-taupe-300 tracking-[0.04em]">
          <span>
            <strong className="text-bone-100 font-medium">HOUSE CALLS</strong> · {CITY.toUpperCase()}
          </span>
          <span className="hidden sm:inline">VOL. 01 · ISS. 01</span>
          <span>SPRING 2026</span>
        </div>
      </div>
      <div className="relative bg-smoke-900 overflow-hidden flex items-end min-h-[320px] sm:min-h-[480px] lg:min-h-0 order-1 lg:order-2">
        <Image
          src="/brand/photography/hero.png"
          alt="A practitioner with kit and folded towel at a Chicago loft window"
          fill
          priority
          className="object-cover object-center"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
        <div className="relative z-10 w-full p-6 bg-gradient-to-t from-black/70 to-transparent font-editorial italic text-body-sm text-bone-200">
          She has just arrived. The kit is heavy. The towels are warm.
        </div>
      </div>
    </section>
  );
}
