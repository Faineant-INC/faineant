"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  listClientBookings,
  type ClientBooking,
} from "@/lib/data-client";

const ACTIVE_STATUSES = new Set(["PENDING", "CONFIRMED", "IN_PROGRESS"]);

function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function dateParts(value: string) {
  const date = new Date(value);
  return {
    date: new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" })
      .format(date)
      .toUpperCase(),
    detail: new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    })
      .format(date)
      .toUpperCase(),
    long: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date),
  };
}

function providerName(booking: ClientBooking): string {
  const user = booking.providerProfile?.user;
  return (
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
    booking.providerProfile?.businessName ||
    "Your practitioner"
  );
}

export default function DashboardPage() {
  const { user, accessToken } = useAuth();
  const [bookings, setBookings] = useState<ClientBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    listClientBookings()
      .then(setBookings)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Bookings are unavailable."),
      )
      .finally(() => setLoading(false));
  }, [accessToken]);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const upcomingRows = bookings
      .filter(
        (booking) =>
          ACTIVE_STATUSES.has(booking.status) &&
          new Date(booking.endTime).getTime() >= now,
      )
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
    const pastRows = bookings
      .filter(
        (booking) =>
          !ACTIVE_STATUSES.has(booking.status) ||
          new Date(booking.endTime).getTime() < now,
      )
      .slice(0, 6);
    return { upcoming: upcomingRows, past: pastRows };
  }, [bookings]);

  const next = upcoming[0];
  const nextDate = next ? dateParts(next.startTime) : null;

  return (
    <div className="px-5 md:px-10 lg:px-14 py-8 md:py-12 flex flex-col gap-8 md:gap-12">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 pb-5 border-b border-smoke-700">
        <h2 className="font-display text-[clamp(1.75rem,5vw,2.625rem)] leading-none text-bone-100">
          Welcome,{ " "}
          <em className="font-editorial italic font-light text-champagne-400">
            {user?.firstName || "there"}.
          </em>
        </h2>
        <p className="font-editorial italic text-body-lg text-bone-200 md:max-w-[380px] md:text-right leading-snug">
          {next && nextDate
            ? `${providerName(next)} is next, ${nextDate.long}.`
            : "Your calendar is quiet. Choose a live service when you are ready."}
        </p>
      </header>

      {error && (
        <p role="alert" className="border border-oxblood-500/60 px-5 py-4 text-oxblood-400">
          {error}
        </p>
      )}

      <section>
        <h3 className="text-label uppercase tracking-[0.32em] text-taupe-300 mb-5 flex flex-wrap gap-2 justify-between items-center font-medium">
          Upcoming{" "}
          <span className="font-mono text-champagne-400">
            {upcoming.length.toString().padStart(2, "0")} RESERVED
          </span>
        </h3>
        {loading ? (
          <p className="border border-smoke-700 px-6 py-16 text-center font-mono text-mono uppercase tracking-[0.24em] text-taupe-300">
            Reading the calendar…
          </p>
        ) : next && nextDate ? (
          <article className="bg-gradient-to-br from-smoke-800 to-smoke-950 border border-smoke-700 p-6 sm:p-9 flex flex-col gap-[1.125rem]">
            <div className="flex flex-wrap gap-2 justify-between items-center font-mono text-mono text-taupe-300 tracking-[0.04em]">
              <span>{nextDate.date} · {nextDate.detail}</span>
              <strong className="text-champagne-400 font-medium">{next.status}</strong>
            </div>
            <h3 className="font-display text-[clamp(1.5rem,4vw,2rem)] leading-[1.05] text-bone-100">
              {next.service.name}{" "}
              <em className="font-editorial italic font-light text-champagne-400">
                at home.
              </em>
            </h3>
            <p className="font-editorial italic text-body-lg text-bone-200 leading-snug">
              {providerName(next)} · {next.location ?? "Address to be confirmed"}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 justify-between items-center pt-4 border-t border-smoke-700 text-label uppercase tracking-[0.28em] text-taupe-300">
              <span>{next.service.category.replaceAll("_", " ")} · {next.service.durationMinutes} MIN</span>
              <span>{money(next.totalPriceInCents)}</span>
            </div>
            <Link
              href="/dashboard/client/bookings"
              className="mt-2 px-4 py-3 text-center bg-bone-100 text-smoke-900 text-label uppercase tracking-[0.28em] font-medium"
            >
              View reservation →
            </Link>
          </article>
        ) : (
          <div className="border border-smoke-700 px-6 py-16 text-center">
            <p className="font-editorial italic text-body-lg text-bone-200">
              No upcoming reservations.
            </p>
            <Link
              href="/providers"
              className="inline-block mt-6 text-label uppercase tracking-[0.28em] text-champagne-400"
            >
              Browse the salon →
            </Link>
          </div>
        )}
      </section>

      <section>
        <h3 className="text-label uppercase tracking-[0.32em] text-taupe-300 mb-5 flex flex-wrap gap-2 justify-between items-center font-medium">
          Past visits{" "}
          <span className="font-mono text-champagne-400">
            {past.length.toString().padStart(2, "0")} RECENT
          </span>
        </h3>
        {past.length === 0 ? (
          <p className="border border-smoke-700 px-6 py-12 font-editorial italic text-bone-200">
            Completed and cancelled visits will be kept here.
          </p>
        ) : (
          <div>
            {past.map((booking) => {
              const when = dateParts(booking.startTime);
              return (
                <div
                  key={booking.id}
                  className="bg-smoke-900 border border-smoke-700 p-5 sm:px-6 grid grid-cols-2 sm:grid-cols-[90px_1fr_1fr_auto] gap-4 sm:gap-6 items-center mb-px"
                >
                  <div className="font-mono text-mono text-taupe-300">
                    {when.date}
                    <strong className="block text-bone-100 font-medium text-[13px]">
                      {when.detail}
                    </strong>
                  </div>
                  <div className="font-display font-medium text-[15px] text-bone-100">
                    {booking.service.name}
                    <small className="block font-editorial italic font-normal text-[13px] text-bone-200 mt-0.5">
                      {booking.service.durationMinutes} min · {booking.status}
                    </small>
                  </div>
                  <div className="text-label uppercase tracking-[0.18em] text-taupe-300 font-medium text-[11px]">
                    {providerName(booking)}
                  </div>
                  <div className="font-mono text-mono text-champagne-400 text-[13px] text-right">
                    {money(booking.totalPriceInCents)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
