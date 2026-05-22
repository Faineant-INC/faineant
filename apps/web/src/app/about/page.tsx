import { Topbar } from "@/components/layout/topbar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata = {
  title: "About — FAINEANT",
  description:
    "A Chicago directory of beauty practitioners who travel to your home. Founded 2026. Fourteen practitioners. One city, on purpose.",
};

const SECTIONS = [
  {
    number: "№ 01",
    label: "Why",
    title: "Why",
    accent: "we exist.",
    body: [
      "Most beauty marketplaces optimise for scale. Ten thousand practitioners in every city, ranked by an algorithm nobody can read, paying to be visible. The work suffers. The clients suffer. The practitioners suffer most of all.",
      "We started FAINEANT for the opposite reason. We wanted somewhere to send our friends — a small, edited list of practitioners who travel, who take their time, who treat your apartment as if it were a chair they had built themselves. Slow living, in your living room.",
      "Everything we have built since has followed from that first instinct: keep it small, keep it Chicago, keep it honest.",
    ],
  },
  {
    number: "№ 02",
    label: "Who",
    title: "Who",
    accent: "we are.",
    body: [
      "Fourteen practitioners. Hair, nails, face, lash, barber, makeup. All of them work for themselves. All of them have been doing this for at least five years, most for a great deal longer. Each of them was introduced by a client we trust.",
      "We are not a salon. There is no chair to fight over, no front desk, no music you didn't choose. The practitioner brings the work to you. We make the introduction, hold the calendar, take a small cut, and stay out of the way.",
    ],
  },
  {
    number: "№ 03",
    label: "Next",
    title: "What's",
    accent: "next.",
    body: [
      "We are not in a hurry to grow. Chicago first, properly — every neighbourhood, every kind of hair, every reasonable hour. When the work in this city is done, we will think about the next one. Not before.",
      "If you would like to be told when we open the waitlist for new practitioners, or when we begin in another city, write to us. There is no algorithm. A person reads every note.",
    ],
  },
];

export default function AboutPage() {
  return (
    <>
      <Topbar />
      <SiteHeader />
      <main className="bg-smoke-900 text-bone-100">
        <section className="max-w-[1480px] mx-auto px-5 md:px-10 lg:px-14 py-16 md:py-24 border-b border-smoke-700">
          <span className="text-label uppercase tracking-[0.32em] text-taupe-300 font-medium">
            № 01 · The House
          </span>
          <h1 className="font-display display-compressed text-[clamp(48px,10vw,80px)] leading-[0.94] text-bone-100 mt-4">
            What{" "}
            <em className="font-editorial italic font-light text-champagne-400">
              we are.
            </em>
          </h1>
          <p className="font-editorial italic font-light text-[clamp(20px,4vw,28px)] leading-snug text-bone-200 mt-10 max-w-[760px]">
            A Chicago directory of beauty practitioners who travel to your home.
            Founded 2026. Fourteen practitioners. One city, on purpose.
          </p>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mt-12 md:mt-16 pt-8 border-t border-taupe-500">
            <div>
              <dt className="text-label uppercase tracking-[0.3em] text-taupe-300 mb-2 font-medium">
                Founded
              </dt>
              <dd className="font-editorial italic text-body-lg text-bone-100">
                2026
              </dd>
            </div>
            <div>
              <dt className="text-label uppercase tracking-[0.3em] text-taupe-300 mb-2 font-medium">
                Practitioners
              </dt>
              <dd className="font-editorial italic text-body-lg text-bone-100">
                Fourteen
              </dd>
            </div>
            <div>
              <dt className="text-label uppercase tracking-[0.3em] text-taupe-300 mb-2 font-medium">
                City
              </dt>
              <dd className="font-editorial italic text-body-lg text-bone-100">
                Chicago, only
              </dd>
            </div>
            <div>
              <dt className="text-label uppercase tracking-[0.3em] text-taupe-300 mb-2 font-medium">
                Cancellation
              </dt>
              <dd className="font-editorial italic text-body-lg text-bone-100">
                Free until midnight
              </dd>
            </div>
          </dl>
        </section>

        {SECTIONS.map((s, idx) => (
          <section
            key={s.label}
            className={`max-w-[1480px] mx-auto px-5 md:px-10 lg:px-14 py-16 md:py-24 ${
              idx < SECTIONS.length - 1 ? "border-b border-smoke-700" : ""
            }`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
              <div className="lg:col-span-4">
                <span className="text-label uppercase tracking-[0.32em] text-taupe-300 font-medium font-mono">
                  {s.number}
                </span>
                <h2 className="font-display display-compressed text-[clamp(36px,8vw,60px)] leading-[0.95] text-bone-100 mt-4">
                  {s.title}{" "}
                  <em className="font-editorial italic font-light text-champagne-400">
                    {s.accent}
                  </em>
                </h2>
              </div>
              <div className="lg:col-span-8 space-y-6">
                {s.body.map((para, i) => (
                  <p
                    key={i}
                    className="font-editorial italic font-light text-[clamp(17px,3.2vw,22px)] leading-relaxed text-bone-200 max-w-[640px]"
                  >
                    {para}
                  </p>
                ))}
              </div>
            </div>
          </section>
        ))}
      </main>
      <SiteFooter />
    </>
  );
}
