const STEPS = [
  {
    n: "№ 01",
    title: "Pick",
    titleEm: "a service.",
    body: "Hair, nails, face, lashes, makeup, barber. Six rituals, hand-edited. We don’t have a thousand options on purpose.",
  },
  {
    n: "№ 02",
    title: "Pick",
    titleEm: "a window.",
    body: "Tonight, tomorrow, Sunday morning. Ninety minutes is the typical visit. Most people book again before the practitioner leaves.",
  },
  {
    n: "№ 03",
    title: "Open",
    titleEm: "the door.",
    body: "She arrives with a kit, a soft voice, and her own warm towels. You stay where you are. The lighting is already perfect.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-16 md:py-24 lg:py-30 border-b border-smoke-700">
      <div className="max-w-[1480px] mx-auto px-5 md:px-10 lg:px-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-start lg:items-end mb-10 md:mb-16 pb-6 border-b border-taupe-500 gap-6 lg:gap-12">
          <h3 className="font-display display-compressed text-[clamp(36px,8vw,56px)] leading-[0.94] text-bone-100">
            Three taps.{" "}
            <em className="font-editorial italic font-light text-champagne-400 tracking-[-0.02em]">
              One nap.
            </em>
          </h3>
          <p className="font-editorial italic text-[17px] md:text-[19px] text-bone-200 leading-snug max-w-[460px] lg:justify-self-end">
            A directory of practitioners who travel with their own light, towels, and silence — booked in less time than it takes to put on shoes you no longer need to wear.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-smoke-700">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="bg-smoke-900 p-8 px-6 sm:p-12 sm:px-9 flex flex-col gap-4 min-h-[260px] md:min-h-[340px]"
            >
              <span className="font-mono text-mono text-champagne-400 tracking-[0.06em]">
                {step.n}
              </span>
              <h4 className="font-display display-compressed text-[clamp(28px,5vw,36px)] leading-[1.02] text-bone-100 mt-2">
                {step.title}{" "}
                <em className="font-editorial italic font-light text-champagne-400">
                  {step.titleEm}
                </em>
              </h4>
              <p className="font-editorial italic text-[16px] md:text-[17px] text-bone-200 leading-snug mt-auto">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
