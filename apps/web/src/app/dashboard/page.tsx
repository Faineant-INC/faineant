"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

const PAST = [
  {
    date: "14 MAR",
    weekday: "FRI · 13:00",
    svc: "Lashes laid by hand",
    subtitle: "120 min · Wicker Park",
    pract: "IMANI OKAFOR",
    quote: "Soft, full, never looks like work.",
    price: "$220.00",
  },
  {
    date: "22 FEB",
    weekday: "SAT · 11:00",
    svc: "Hour of nothing",
    subtitle: "90 min · West Loop",
    pract: "MAEVE LE GAL",
    quote: "My favourite haircut in years.",
    price: "$180.00",
  },
  {
    date: "04 FEB",
    weekday: "TUE · 18:30",
    svc: "Quiet manicure",
    subtitle: "75 min · Logan Square",
    pract: "YUMI WATANABE",
    quote: "She brought her own lamp.",
    price: "$120.00",
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  // TODO(impl): wire greeting copy + upcoming/past data to real bookings API.
  // For now, fall back to "Sasha" until auth + booking data are available.
  const userName = user?.firstName || "Sasha";

  return (
    <div className="px-5 md:px-10 lg:px-14 py-8 md:py-12 flex flex-col gap-8 md:gap-12">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 pb-5 border-b border-smoke-700">
        <h2 className="font-display text-[clamp(1.75rem,5vw,2.625rem)] leading-none text-bone-100">
          Good morning,{" "}
          <em className="font-editorial italic font-light text-champagne-400">
            {userName}.
          </em>
        </h2>
        <p className="font-editorial italic text-body-lg text-bone-200 md:max-w-[340px] md:text-right leading-snug">
          You have one visit on the calendar &mdash; Maeve, tomorrow at 14:00.
          Two practitioners are on your &ldquo;again&rdquo; list.
        </p>
      </header>

      <section>
        <h4 className="text-label uppercase tracking-[0.32em] text-taupe-300 mb-5 flex flex-wrap gap-2 justify-between items-center font-medium">
          Upcoming{" "}
          <span className="font-mono text-champagne-400">
            01 / NEXT 30 DAYS
          </span>
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
          {/* TODO(impl): replace with the next confirmed booking from /bookings/client */}
          <article className="bg-gradient-to-br from-smoke-800 to-smoke-950 border border-smoke-700 p-6 sm:p-9 flex flex-col gap-[1.125rem]">
            <div className="flex flex-wrap gap-2 justify-between items-center font-mono text-mono text-taupe-300 tracking-[0.04em]">
              <span>WED &middot; 28 APR &middot; 14:00 &middot; IN 21 HOURS</span>
              <strong className="text-champagne-400 font-medium">SOON</strong>
            </div>
            <h3 className="font-display text-[clamp(1.5rem,4vw,2rem)] leading-[1.05] text-bone-100">
              An{" "}
              <em className="font-editorial italic font-light text-champagne-400">
                hour of nothing,
              </em>
              <br />
              by Maeve.
            </h3>
            <p className="font-editorial italic text-body-lg text-bone-200 leading-snug">
              Maeve will arrive at your West Loop address tomorrow at 14:00.
              She brings a kit, towels, and a small jar of clarifying tea. You
              don&rsquo;t bring anything.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 justify-between items-center pt-4 border-t border-smoke-700 text-label uppercase tracking-[0.28em] text-taupe-300">
              <span>HAIR &middot; 90 MIN</span>
              <span>WEST LOOP</span>
              <span>$180.00</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <Link
                href="#"
                className="flex-1 px-2.5 py-2.5 text-center bg-bone-100 text-smoke-900 text-label uppercase tracking-[0.28em] font-medium"
              >
                Open the door at 14:00
              </Link>
              <Link
                href="#"
                className="flex-1 px-2.5 py-2.5 text-center border border-smoke-700 text-bone-200 text-label uppercase tracking-[0.28em] font-medium"
              >
                Reschedule
              </Link>
              <Link
                href="#"
                className="flex-1 px-2.5 py-2.5 text-center border border-smoke-700 text-bone-200 text-label uppercase tracking-[0.28em] font-medium"
              >
                Cancel
              </Link>
            </div>
          </article>

          {/* TODO(impl): "again?" rebooking suggestion driven by past-frequency heuristic */}
          <article className="bg-smoke-800 border border-smoke-700 p-6 sm:p-8 flex flex-col gap-[1.125rem]">
            <div className="flex flex-wrap gap-2 justify-between items-center font-mono text-mono text-taupe-300">
              <span>READY WHEN YOU ARE</span>
              <strong className="text-champagne-400 font-medium">
                UNBOOKED
              </strong>
            </div>
            <h3 className="font-display text-[clamp(1.5rem,4vw,2rem)] leading-[1.05] text-bone-100">
              Imani,{" "}
              <em className="font-editorial italic font-light text-champagne-400">
                again?
              </em>
            </h3>
            <p className="font-editorial italic text-body-lg text-bone-200 leading-snug">
              It&rsquo;s been six weeks since your last lash visit. Imani has
              Saturday morning open this week.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 justify-between items-center pt-4 border-t border-smoke-700 text-label uppercase tracking-[0.28em] text-taupe-300">
              <span>LASH &middot; 120 MIN</span>
              <span>WICKER PARK</span>
              <span>$220.00</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <Link
                href="#"
                className="flex-1 px-2.5 py-2.5 text-center bg-bone-100 text-smoke-900 text-label uppercase tracking-[0.28em] font-medium"
              >
                Reserve Sat 09:30
              </Link>
              <Link
                href="#"
                className="flex-1 px-2.5 py-2.5 text-center border border-smoke-700 text-bone-200 text-label uppercase tracking-[0.28em] font-medium"
              >
                See windows
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section>
        <h4 className="text-label uppercase tracking-[0.32em] text-taupe-300 mb-5 flex flex-wrap gap-2 justify-between items-center font-medium">
          Past visits{" "}
          <span className="font-mono text-champagne-400">
            {PAST.length.toString().padStart(2, "0")} / IDLE COLLECTION
          </span>
        </h4>
        {/* TODO(impl): swap PAST for completed bookings from /bookings/client */}
        <div>
          {PAST.map((row) => (
            <div
              key={`${row.date}-${row.pract}`}
              className="bg-smoke-900 border border-smoke-700 p-5 sm:px-6 grid grid-cols-2 sm:grid-cols-[80px_1fr_1fr_auto_auto] gap-4 sm:gap-6 items-center mb-px hover:bg-smoke-800 transition-colors"
            >
              <div className="font-mono text-mono text-taupe-300">
                {row.date}
                <strong className="block text-bone-100 font-medium text-[13px]">
                  {row.weekday}
                </strong>
              </div>
              <div className="font-display font-medium text-[15px] text-bone-100 tracking-[-0.01em]">
                {row.svc}
                <small className="block font-editorial italic font-normal text-[13px] text-bone-200 mt-0.5">
                  {row.subtitle}
                </small>
              </div>
              <div className="text-label uppercase tracking-[0.18em] text-taupe-300 font-medium text-[11px]">
                {row.pract}
                <small className="block font-editorial italic font-light text-[12px] tracking-normal normal-case text-bone-200 mt-0.5">
                  &ldquo;{row.quote}&rdquo;
                </small>
              </div>
              <div className="font-mono text-mono text-champagne-400 text-[13px] text-right">
                {row.price}
              </div>
              <Link
                href="#"
                className="px-3.5 py-2 border border-smoke-700 text-label uppercase tracking-[0.28em] text-bone-200 font-medium text-[9px]"
              >
                Book again
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
