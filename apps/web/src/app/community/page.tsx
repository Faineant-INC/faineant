import { Topbar } from "@/components/layout/topbar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata = {
  title: "Community — FAINEANT",
  description: "What our clients say. Three voices, in their own words.",
};

const QUOTES = [
  {
    number: "№ 01",
    quote:
      "I had been telling myself I would book a haircut for nine weeks. Maeve walked into my apartment at three on a Sunday and I have not stood in front of a salon mirror since. I am older and lazier and my hair has never looked better.",
    attribution: "Sasha N.",
    detail: "West Loop · Client since March",
  },
  {
    number: "№ 02",
    quote:
      "The whole thing is so quiet. No music, no front desk, no small talk you don't want. She set up by my window, did my nails, packed up, and left. I paid through the app. It was the calmest two hours of my month.",
    attribution: "Eleanor R.",
    detail: "Lincoln Park · Client since August",
  },
  {
    number: "№ 03",
    quote:
      "I was sceptical. House calls always sounded like a corner cut somewhere. They are not. The practitioner who came was better than anyone I have sat in a chair for, and she was at my kitchen table. I have rebooked twice.",
    attribution: "Theo M.",
    detail: "Fulton Market · Client since November",
  },
];

export default function CommunityPage() {
  return (
    <>
      <Topbar />
      <SiteHeader />
      <main className="bg-smoke-900 text-bone-100">
        <section className="max-w-[1480px] mx-auto px-5 md:px-10 lg:px-14 py-16 md:py-24 border-b border-smoke-700">
          <span className="text-label uppercase tracking-[0.32em] text-taupe-300 font-medium">
            № 04 · The Room
          </span>
          <h1 className="font-display display-compressed text-[clamp(48px,10vw,80px)] leading-[0.94] text-bone-100 mt-4">
            What our{" "}
            <em className="font-editorial italic font-light text-champagne-400">
              clients say.
            </em>
          </h1>
          <p className="font-mono text-mono uppercase tracking-[0.3em] text-taupe-300 mt-8">
            Three voices · No edits · No incentives
          </p>
        </section>

        {QUOTES.map((q, idx) => (
          <section
            key={q.attribution}
            className={`max-w-[1480px] mx-auto px-5 md:px-10 lg:px-14 py-20 md:py-32 ${
              idx < QUOTES.length - 1 ? "border-b border-smoke-700" : ""
            }`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12">
              <div className="lg:col-span-3">
                <span className="font-mono text-mono uppercase tracking-[0.3em] text-taupe-300">
                  {q.number}
                </span>
              </div>
              <div className="lg:col-span-9">
                <blockquote className="font-editorial italic font-light text-[clamp(24px,5vw,40px)] leading-[1.18] text-bone-100 max-w-[920px]">
                  &ldquo;{q.quote}&rdquo;
                </blockquote>
                <footer className="mt-8 md:mt-12 pt-6 border-t border-taupe-500 max-w-[920px] flex flex-col sm:flex-row items-start sm:items-baseline sm:justify-between gap-3 sm:gap-6 sm:flex-wrap">
                  <cite className="not-italic font-display text-[1.5rem] leading-none text-bone-100">
                    {q.attribution}
                  </cite>
                  <span className="font-mono text-mono uppercase tracking-[0.3em] text-taupe-300">
                    {q.detail}
                  </span>
                </footer>
              </div>
            </div>
          </section>
        ))}
      </main>
      <SiteFooter />
    </>
  );
}
