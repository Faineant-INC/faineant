export function ManifestoSection() {
  return (
    <section className="relative py-20 md:py-32 lg:py-40 text-center border-b border-smoke-700 bg-smoke-950 overflow-hidden">
      <div
        className="absolute inset-0 monogram-watermark opacity-[0.04] pointer-events-none"
        aria-hidden
      />
      <div className="relative z-10 max-w-[920px] mx-auto px-5 md:px-8">
        <span className="block text-label uppercase tracking-[0.32em] text-champagne-400 mb-6 md:mb-9">
          Manifesto · 01
        </span>
        <blockquote className="font-editorial italic font-light text-[clamp(28px,6vw,60px)] leading-[1.15] tracking-[-0.01em] text-bone-100 mb-6 md:mb-9">
          The{" "}
          <em className="font-display display-compressed text-champagne-400 not-italic">
            only luxury
          </em>{" "}
          we still believe in is not having to leave.
        </blockquote>
        <div className="text-label uppercase tracking-[0.3em] text-taupe-300">
          — FAINEANT, IDLE COLLECTION №01
        </div>
      </div>
    </section>
  );
}
