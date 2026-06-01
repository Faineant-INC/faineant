import Image from "next/image";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";

type SlotStatus = "open" | "taken" | "selected";

type Slot = { time: string; status: SlotStatus };

type Window = {
  day: string;
  date: string;
  slots: Slot[];
  openCount: number;
};

type Service = {
  catLabel: string;
  title: string;
  titleEm: string;
  titleEnd: string;
  price: string;
  durationMin: number;
  imgSrc: string;
  imgCaption: string;
  body: string;
  includes: { label: string; value: string }[];
  practitionerName: string;
  windows: Window[];
};

// TODO(impl): replace static map with Prisma query
const SERVICES: Record<string, Service> = {
  "hour-of-nothing": {
    catLabel: "Service № 01 · Hair · West Loop",
    title: "An",
    titleEm: "hour of nothing",
    titleEnd: "on your couch.",
    price: "$180.00",
    durationMin: 90,
    imgSrc: "/brand/photography/tile-hair.png",
    imgCaption: "An hour of nothing — performed slowly, in your living room.",
    body: "A slow shampoo at your kitchen sink. Warm towels she carries up four flights. The chair is whichever one of yours reclines furthest. Conversation is optional and, on first visits, gently discouraged.",
    includes: [
      { label: "Includes", value: "Cut, shampoo, blow-dry" },
      { label: "Brings", value: "Kit, towels, kettle music" },
      { label: "Needs", value: "One outlet, one chair" },
      { label: "By", value: "Maeve Le Gal · 22 yrs · ex-Cristophe Paris" },
    ],
    practitionerName: "Maeve Le Gal",
    windows: [
      { day: "Tomorrow", date: "WED · 28 APR", slots: [{ time: "10:00", status: "open" }, { time: "12:30", status: "taken" }, { time: "14:00", status: "selected" }, { time: "16:30", status: "open" }], openCount: 4 },
      { day: "Thursday", date: "29 APR", slots: [{ time: "11:00", status: "open" }, { time: "13:00", status: "open" }, { time: "15:30", status: "open" }], openCount: 3 },
      { day: "Saturday", date: "01 MAY", slots: [{ time: "09:30", status: "open" }, { time: "11:00", status: "taken" }, { time: "14:00", status: "taken" }], openCount: 1 },
    ],
  },
  "lashes-laid-by-hand": {
    catLabel: "Service № 02 · Lashes · Wicker Park",
    title: "Lashes",
    titleEm: "laid by hand,",
    titleEnd: "one at a time.",
    price: "$220.00",
    durationMin: 120,
    imgSrc: "/brand/photography/tile-lash.png",
    imgCaption: "Lashes set quietly — eyes closed, two hours, no phone.",
    body: "She sets a lash bed where your reading chair used to be. The light is low, the room is warm, and the only sound is the soft click of tweezers. You will fall asleep. You are meant to.",
    includes: [
      { label: "Includes", value: "Full set, classic or hybrid" },
      { label: "Brings", value: "Bed, lamp, linen, tea" },
      { label: "Needs", value: "Quiet room, two hours" },
      { label: "By", value: "Inès Caron · 9 yrs · ex-Lash & Co. Paris" },
    ],
    practitionerName: "Inès Caron",
    windows: [
      { day: "Tomorrow", date: "WED · 28 APR", slots: [{ time: "09:00", status: "taken" }, { time: "11:30", status: "open" }, { time: "14:00", status: "open" }], openCount: 2 },
      { day: "Friday", date: "30 APR", slots: [{ time: "10:00", status: "open" }, { time: "13:30", status: "selected" }, { time: "16:00", status: "open" }, { time: "18:30", status: "open" }], openCount: 3 },
      { day: "Sunday", date: "02 MAY", slots: [{ time: "11:00", status: "open" }, { time: "14:00", status: "taken" }, { time: "16:30", status: "open" }], openCount: 2 },
    ],
  },
  "quiet-manicure": {
    catLabel: "Service № 03 · Nails · Lincoln Park",
    title: "A",
    titleEm: "quiet manicure",
    titleEnd: "at your table.",
    price: "$120.00",
    durationMin: 75,
    imgSrc: "/brand/photography/tile-nails.png",
    imgCaption: "A manicure performed at the kitchen table — slowly, in good light.",
    body: "She unrolls a linen mat across your dining table. Files cut from glass. Polish from a small Parisian house. There is no buffer machine, no UV lamp, no music you do not choose yourself.",
    includes: [
      { label: "Includes", value: "Shape, cuticle, polish" },
      { label: "Brings", value: "Mat, files, full polish library" },
      { label: "Needs", value: "Table, two chairs, side lamp" },
      { label: "By", value: "Soraya Mehdi · 11 yrs · ex-Maison Jovoy" },
    ],
    practitionerName: "Soraya Mehdi",
    windows: [
      { day: "Tomorrow", date: "WED · 28 APR", slots: [{ time: "10:30", status: "open" }, { time: "13:00", status: "open" }, { time: "15:30", status: "taken" }], openCount: 2 },
      { day: "Thursday", date: "29 APR", slots: [{ time: "09:30", status: "selected" }, { time: "12:00", status: "open" }, { time: "14:30", status: "open" }], openCount: 2 },
      { day: "Saturday", date: "01 MAY", slots: [{ time: "10:00", status: "open" }, { time: "12:30", status: "open" }, { time: "15:00", status: "open" }, { time: "17:30", status: "taken" }], openCount: 3 },
    ],
  },
  "the-clean-line": {
    catLabel: "Service № 04 · Barber · Logan Square",
    title: "The",
    titleEm: "clean line,",
    titleEnd: "drawn at home.",
    price: "$95.00",
    durationMin: 60,
    imgSrc: "/brand/photography/tile-barber.png",
    imgCaption: "The clean line — drawn slowly, with a hot towel between passes.",
    body: "He arrives with a folded chair and a leather strop. The hot towel is wrapped twice, the lather is whipped by hand, and the straight razor is honed in front of you. The whole thing takes an hour. You will not be rushed.",
    includes: [
      { label: "Includes", value: "Cut, shave, hot-towel finish" },
      { label: "Brings", value: "Chair, strop, towels, lather" },
      { label: "Needs", value: "One outlet, one mirror" },
      { label: "By", value: "Auguste Rey · 18 yrs · ex-Geo. F. Trumper London" },
    ],
    practitionerName: "Auguste Rey",
    windows: [
      { day: "Tomorrow", date: "WED · 28 APR", slots: [{ time: "08:00", status: "open" }, { time: "10:30", status: "selected" }, { time: "13:00", status: "open" }, { time: "15:30", status: "taken" }], openCount: 3 },
      { day: "Friday", date: "30 APR", slots: [{ time: "09:00", status: "open" }, { time: "11:30", status: "open" }, { time: "14:00", status: "open" }], openCount: 3 },
      { day: "Saturday", date: "01 MAY", slots: [{ time: "08:30", status: "taken" }, { time: "11:00", status: "open" }, { time: "13:30", status: "taken" }], openCount: 1 },
    ],
  },
};

export default function ServiceDetailPage({ params }: { params: { slug: string } }) {
  const s = SERVICES[params.slug];
  if (!s) notFound();

  return (
    <>
      <Topbar />
      <SiteHeader />
      <main className="max-w-[1480px] mx-auto px-5 md:px-10 lg:px-14 py-10 md:py-14 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-14">
        <div className="aspect-[4/5] relative bg-smoke-900 border border-smoke-700 overflow-hidden">
          <Image src={s.imgSrc} alt={s.title} fill className="object-cover object-center" sizes="(max-width: 1024px) 100vw, 55vw" />
          <div className="absolute bottom-0 inset-x-0 p-4.5 bg-gradient-to-t from-black/85 to-transparent font-editorial italic text-body-sm text-bone-200 z-10">
            {s.imgCaption}
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div>
            <span className="text-label uppercase tracking-[0.32em] text-taupe-300 font-medium block mb-3.5">{s.catLabel}</span>
            <h2 className="font-display display-compressed text-[clamp(32px,7vw,46px)] leading-[1.02] text-bone-100">
              {s.title}{" "}
              <em className="font-editorial italic font-light text-champagne-400">{s.titleEm}</em>{" "}
              {s.titleEnd}
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 font-mono text-mono text-taupe-300 pb-4 border-b border-smoke-700">
            <span>{s.durationMin} MINUTES · IN-HOME</span>
            <span className="font-display font-medium text-[1.5rem] text-champagne-400 tracking-[-0.01em]">{s.price}</span>
          </div>
          <p className="font-editorial italic font-light text-body-lg text-bone-200 leading-relaxed">{s.body}</p>
          <div className="py-5 border-t border-b border-smoke-700 flex flex-col gap-2.5">
            {s.includes.map((row) => (
              <div key={row.label} className="flex justify-between items-center text-body-sm text-bone-200">
                <span className="text-label uppercase tracking-[0.18em] text-taupe-300 font-medium text-[11px]">{row.label}</span>
                <span>{row.value}</span>
              </div>
            ))}
          </div>
          <div>
            <span className="text-label uppercase tracking-[0.32em] text-taupe-300 font-medium block mb-2">Available windows · this week</span>
            <div className="flex flex-col gap-2">
              {s.windows.map((w) => (
                <div key={w.date} className="grid grid-cols-[110px_1fr_auto] sm:grid-cols-[140px_1fr_auto] gap-3 sm:gap-4 items-center p-3.5 px-4 border border-smoke-700 hover:border-taupe-500 hover:bg-smoke-800 transition-all duration-[250ms] ease-fai-smooth cursor-pointer">
                  <div className="font-display font-medium text-[15px] text-bone-100 tracking-[-0.01em]">{w.day}<small className="block font-sans text-[10px] text-taupe-300 uppercase tracking-[0.18em] font-normal mt-0.5">{w.date}</small></div>
                  <div className="flex gap-1.5 flex-wrap">
                    {w.slots.map((slot) => (
                      <span key={slot.time} className={`px-3 py-1.5 font-mono text-[12px] tracking-[0.02em] border ${slot.status === "selected" ? "bg-champagne-400 text-smoke-900 border-champagne-400" : slot.status === "taken" ? "text-taupe-400 line-through cursor-not-allowed border-smoke-700" : "text-bone-200 border-smoke-700 hover:border-champagne-400 hover:text-champagne-400 cursor-pointer"}`}>
                        {slot.time}
                      </span>
                    ))}
                  </div>
                  <span className="text-label uppercase tracking-[0.18em] text-taupe-300 font-medium text-[10px]">{w.openCount} OPEN</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 md:gap-6 pt-6 border-t border-taupe-500">
            <p className="font-editorial italic text-body-lg text-bone-200">
              Wed <strong className="font-display font-medium not-italic text-bone-100 tracking-[-0.01em]">28 Apr</strong> at <strong className="font-display font-medium not-italic text-bone-100 tracking-[-0.01em]">14:00</strong> — at the address on file (West Loop).
            </p>
            <Button size="lg" variant="primary" className="w-full md:w-auto">Reserve · {s.price.split(".")[0]}</Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
