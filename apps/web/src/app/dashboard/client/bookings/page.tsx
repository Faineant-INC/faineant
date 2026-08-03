"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  listClientBookings,
  updateBookingStatus,
} from "@/lib/data-client";
import { useAuth } from "@/lib/auth";

interface BookingItem {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  totalPriceInCents: number;
  location: string | null;
  notes: string | null;
  service: { name: string; category: string; durationMinutes: number };
  providerProfile?: {
    user?: { firstName?: string; lastName?: string; avatarUrl?: string | null };
    businessName?: string;
  };
}

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];
const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, "0")} ${MONTHS[d.getMonth()]}`;
}

function shortWeekdayTime(iso: string): string {
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${WEEKDAYS[d.getDay()]} · ${hh}:${mm}`;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function providerName(b: BookingItem): string {
  const first = b.providerProfile?.user?.firstName ?? "";
  const last = b.providerProfile?.user?.lastName ?? "";
  return `${first} ${last}`.trim().toUpperCase() || "UNKNOWN";
}

export default function ClientBookingsPage() {
  const { accessToken } = useAuth();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cancelBooking, setCancelBooking] = useState<BookingItem | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadBookings = useCallback(async () => {
    if (!accessToken) return;
    setError(null);
    setLoading(true);
    try {
      setBookings(await listClientBookings());
    } catch {
      // Network error on initial load — degrade to empty state
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const up: BookingItem[] = [];
    const pa: BookingItem[] = [];
    for (const b of bookings) {
      const isPast =
        new Date(b.startTime) < now ||
        b.status === "COMPLETED" ||
        b.status === "NO_SHOW";
      const isCancelled = b.status === "CANCELLED";
      if (isCancelled) continue;
      if (isPast) pa.push(b);
      else up.push(b);
    }
    up.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
    pa.sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    );
    return { upcoming: up, past: pa };
  }, [bookings]);

  async function handleCancel() {
    if (!cancelBooking || !accessToken) return;
    setCancelling(true);
    try {
      await updateBookingStatus(cancelBooking.id, "CANCELLED");
      setCancelBooking(null);
      await loadBookings();
    } catch {
      setError("Failed to cancel booking. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  function canCancel(b: BookingItem): boolean {
    return b.status === "PENDING" || b.status === "CONFIRMED";
  }

  return (
    <div className="px-5 md:px-10 lg:px-14 py-8 md:py-12 flex flex-col gap-8 md:gap-12">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 pb-5 border-b border-smoke-700">
        <h2 className="font-display text-[clamp(1.75rem,5vw,2.625rem)] leading-none text-bone-100">
          Your{" "}
          <em className="font-editorial italic font-light text-champagne-400">
            visits.
          </em>
        </h2>
        <p className="font-editorial italic text-body-lg text-bone-200 md:max-w-[340px] md:text-right leading-snug">
          A short, slow ledger. What&rsquo;s coming, and what&rsquo;s already
          been.
        </p>
      </header>

      {error && (
        <div className="border border-smoke-700 bg-smoke-800 px-4 py-3 text-label uppercase tracking-[0.18em] text-bone-200">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 font-mono text-mono text-champagne-400"
          >
            DISMISS
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-taupe-300" />
        </div>
      ) : (
        <>
          <section>
            <h4 className="text-label uppercase tracking-[0.32em] text-taupe-300 mb-5 flex flex-wrap gap-2 justify-between items-center font-medium">
              Upcoming{" "}
              <span className="font-mono text-champagne-400">
                {upcoming.length.toString().padStart(2, "0")} / ON THE CALENDAR
              </span>
            </h4>
            {upcoming.length === 0 ? (
              <div className="bg-smoke-900 border border-smoke-700 p-6 sm:p-9 text-center">
                <p className="font-editorial italic text-body-lg text-bone-200">
                  Nothing on the calendar. The week is yours.
                </p>
                <Link
                  href="/practitioners"
                  className="mt-4 inline-block px-4 py-2.5 border border-smoke-700 text-label uppercase tracking-[0.28em] text-bone-200 font-medium"
                >
                  Find a practitioner
                </Link>
              </div>
            ) : (
              <div>
                {upcoming.map((b) => (
                  <div
                    key={b.id}
                    className="bg-smoke-900 border border-smoke-700 p-5 sm:px-6 grid grid-cols-2 sm:grid-cols-[80px_1fr_1fr_auto_auto] gap-4 sm:gap-6 items-center mb-px hover:bg-smoke-800 transition-colors"
                  >
                    <div className="font-mono text-mono text-taupe-300">
                      {shortDate(b.startTime)}
                      <strong className="block text-bone-100 font-medium text-[13px]">
                        {shortWeekdayTime(b.startTime)}
                      </strong>
                    </div>
                    <div className="font-display font-medium text-[15px] text-bone-100 tracking-[-0.01em]">
                      {b.service.name}
                      <small className="block font-editorial italic font-normal text-[13px] text-bone-200 mt-0.5">
                        {b.service.durationMinutes} min
                        {b.location ? ` · ${b.location}` : ""}
                      </small>
                    </div>
                    <div className="text-label uppercase tracking-[0.18em] text-taupe-300 font-medium text-[11px]">
                      {providerName(b)}
                      <small className="block font-editorial italic font-light text-[12px] tracking-normal normal-case text-bone-200 mt-0.5">
                        {b.status.replace(/_/g, " ").toLowerCase()}
                      </small>
                    </div>
                    <div className="font-mono text-mono text-champagne-400 text-[13px] text-right">
                      {formatPrice(b.totalPriceInCents)}
                    </div>
                    {canCancel(b) ? (
                      <button
                        type="button"
                        onClick={() => setCancelBooking(b)}
                        className="px-3.5 py-2 border border-smoke-700 text-label uppercase tracking-[0.28em] text-bone-200 font-medium text-[9px]"
                      >
                        Cancel
                      </button>
                    ) : (
                      <span className="px-3.5 py-2 text-label uppercase tracking-[0.28em] text-taupe-300 font-medium text-[9px]">
                        &mdash;
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h4 className="text-label uppercase tracking-[0.32em] text-taupe-300 mb-5 flex flex-wrap gap-2 justify-between items-center font-medium">
              Past visits{" "}
              <span className="font-mono text-champagne-400">
                {past.length.toString().padStart(2, "0")} / IDLE COLLECTION
              </span>
            </h4>
            {past.length === 0 ? (
              <div className="bg-smoke-900 border border-smoke-700 p-6 sm:p-9 text-center">
                <p className="font-editorial italic text-body-lg text-bone-200">
                  No past visits yet. Soon.
                </p>
              </div>
            ) : (
              <div>
                {past.map((b) => (
                  <div
                    key={b.id}
                    className="bg-smoke-900 border border-smoke-700 p-5 sm:px-6 grid grid-cols-2 sm:grid-cols-[80px_1fr_1fr_auto_auto] gap-4 sm:gap-6 items-center mb-px hover:bg-smoke-800 transition-colors"
                  >
                    <div className="font-mono text-mono text-taupe-300">
                      {shortDate(b.startTime)}
                      <strong className="block text-bone-100 font-medium text-[13px]">
                        {shortWeekdayTime(b.startTime)}
                      </strong>
                    </div>
                    <div className="font-display font-medium text-[15px] text-bone-100 tracking-[-0.01em]">
                      {b.service.name}
                      <small className="block font-editorial italic font-normal text-[13px] text-bone-200 mt-0.5">
                        {b.service.durationMinutes} min
                        {b.location ? ` · ${b.location}` : ""}
                      </small>
                    </div>
                    <div className="text-label uppercase tracking-[0.18em] text-taupe-300 font-medium text-[11px]">
                      {providerName(b)}
                      <small className="block font-editorial italic font-light text-[12px] tracking-normal normal-case text-bone-200 mt-0.5">
                        {b.status === "COMPLETED"
                          ? "“done, quietly.”"
                          : b.status.replace(/_/g, " ").toLowerCase()}
                      </small>
                    </div>
                    <div className="font-mono text-mono text-champagne-400 text-[13px] text-right">
                      {formatPrice(b.totalPriceInCents)}
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
            )}
          </section>
        </>
      )}

      {/* Cancel confirmation */}
      <AlertDialog
        open={cancelBooking !== null}
        onOpenChange={(open) => {
          if (!open && !cancelling) setCancelBooking(null);
        }}
      >
        <AlertDialogContent className="border border-smoke-700 bg-smoke-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-[1.5rem] text-bone-100">
              Cancel this visit?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-editorial italic text-bone-200">
              {cancelBooking
                ? `Your ${cancelBooking.service.name} on ${shortDate(cancelBooking.startTime)} at ${shortWeekdayTime(cancelBooking.startTime).split(" · ")[1] ?? ""}.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={cancelling}
              className="border-smoke-700 text-bone-200 bg-transparent hover:bg-smoke-800"
            >
              Keep it
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCancel();
              }}
              disabled={cancelling}
              className="bg-bone-100 text-smoke-900 hover:bg-bone-200"
            >
              {cancelling ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Cancelling
                </>
              ) : (
                "Yes, cancel"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
