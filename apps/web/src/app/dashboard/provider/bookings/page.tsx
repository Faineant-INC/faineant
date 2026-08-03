"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Loader2,
  CheckCircle2,
  PlayCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  listProviderBookings,
  updateBookingStatus,
} from "@/lib/data-client";
import { useAuth } from "@/lib/auth";

interface BookingItem {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  totalPriceInCents: number;
  notes: string | null;
  location: string | null;
  service: { name: string; category?: string; durationMinutes?: number } | null;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    email?: string;
    phone?: string;
  } | null;
}

type ProviderTab = "pending" | "confirmed" | "in_progress" | "completed" | "all";

const TAB_TO_API_STATUS: Record<ProviderTab, string> = {
  pending: "PENDING",
  confirmed: "CONFIRMED",
  in_progress: "IN_PROGRESS",
  completed: "COMPLETED",
  all: "",
};

const TABS: { value: ProviderTab; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All" },
];

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function clientName(booking: BookingItem): string {
  const first = booking.client?.firstName ?? "";
  const last = booking.client?.lastName ?? "";
  const full = `${first} ${last}`.trim();
  return full || "Unknown";
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ").toLowerCase();
}

export default function ProviderBookingsPage() {
  const { accessToken } = useAuth();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProviderTab>("pending");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [detailBooking, setDetailBooking] = useState<BookingItem | null>(null);
  const [declineBooking, setDeclineBooking] = useState<BookingItem | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);

  const loadBookings = useCallback(async () => {
    if (!accessToken) return;
    setError(null);
    setLoading(true);
    try {
      const apiStatus = TAB_TO_API_STATUS[activeTab];
      setBookings(await listProviderBookings(apiStatus || undefined));
    } catch {
      // Network error on initial load — degrade to empty state
    } finally {
      setLoading(false);
    }
  }, [accessToken, activeTab]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }, [bookings]);

  async function updateStatus(bookingId: string, status: string) {
    if (!accessToken) return;
    setError(null);
    setUpdatingId(bookingId);
    try {
      await updateBookingStatus(bookingId, status);
      await loadBookings();
    } catch {
      setError("Failed to update booking status.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDecline() {
    if (!declineBooking || !accessToken) return;
    setDeclining(true);
    try {
      await updateBookingStatus(declineBooking.id, "CANCELLED");
      setDeclineBooking(null);
      setDeclineReason("");
      await loadBookings();
    } catch {
      setError("Failed to decline booking. Please try again.");
    } finally {
      setDeclining(false);
    }
  }

  function renderActionButtons(booking: BookingItem) {
    const isUpdating = updatingId === booking.id;

    if (booking.status === "PENDING") {
      return (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              updateStatus(booking.id, "CONFIRMED");
            }}
            disabled={isUpdating}
            className="px-3.5 py-2 border border-champagne-400 text-label uppercase tracking-[0.28em] text-champagne-400 font-medium text-[10px] hover:bg-champagne-400 hover:text-smoke-900 disabled:opacity-50"
          >
            {isUpdating ? "…" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeclineBooking(booking);
            }}
            disabled={isUpdating}
            className="px-3.5 py-2 border border-smoke-700 text-label uppercase tracking-[0.28em] text-bone-200 font-medium text-[10px] hover:text-champagne-400"
          >
            Decline
          </button>
        </div>
      );
    }
    if (booking.status === "CONFIRMED") {
      return (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              updateStatus(booking.id, "IN_PROGRESS");
            }}
            disabled={isUpdating}
            className="px-3.5 py-2 border border-champagne-400 text-label uppercase tracking-[0.28em] text-champagne-400 font-medium text-[10px] hover:bg-champagne-400 hover:text-smoke-900 disabled:opacity-50"
          >
            {isUpdating ? "…" : "Start"}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeclineBooking(booking);
            }}
            disabled={isUpdating}
            className="px-3.5 py-2 border border-smoke-700 text-label uppercase tracking-[0.28em] text-bone-200 font-medium text-[10px] hover:text-champagne-400"
          >
            Cancel
          </button>
        </div>
      );
    }
    if (booking.status === "IN_PROGRESS") {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            updateStatus(booking.id, "COMPLETED");
          }}
          disabled={isUpdating}
          className="px-3.5 py-2 border border-champagne-400 text-label uppercase tracking-[0.28em] text-champagne-400 font-medium text-[10px] hover:bg-champagne-400 hover:text-smoke-900 disabled:opacity-50"
        >
          {isUpdating ? "…" : "Complete"}
        </button>
      );
    }
    return (
      <span className="px-3.5 py-2 text-label uppercase tracking-[0.28em] text-taupe-300 font-medium text-[10px]">
        &mdash;
      </span>
    );
  }

  return (
    <div className="px-5 md:px-10 lg:px-14 py-8 md:py-12 flex flex-col gap-8 md:gap-12">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 pb-5 border-b border-smoke-700">
        <h2 className="font-display display-compressed text-[2.625rem] leading-none text-bone-100">
          Today&rsquo;s{" "}
          <em className="font-editorial italic font-light text-champagne-400">
            calendar.
          </em>
        </h2>
        <p className="font-editorial italic text-body-lg text-bone-200 md:max-w-[340px] md:text-right leading-snug">
          Three windows tomorrow, two open Friday.
        </p>
      </header>

      {error && (
        <div className="border border-smoke-700 bg-smoke-800 px-4 py-3 text-label uppercase tracking-[0.18em] text-bone-200 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="font-mono text-mono text-champagne-400"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Tab nav */}
      <nav className="flex gap-1 border-b border-smoke-700 -mt-4 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-3 text-label uppercase tracking-[0.28em] font-medium text-[10px] border-b-2 -mb-px transition-colors ${
                isActive
                  ? "border-champagne-400 text-champagne-400"
                  : "border-transparent text-taupe-300 hover:text-bone-200"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-taupe-300" />
        </div>
      ) : sortedBookings.length === 0 ? (
        <div className="bg-smoke-900 border border-smoke-700 p-6 sm:p-9 text-center">
          <p className="font-editorial italic text-body-lg text-bone-200">
            {activeTab === "pending"
              ? "No requests waiting. The calm is yours."
              : activeTab === "confirmed"
                ? "Nothing confirmed. The week is open."
                : activeTab === "in_progress"
                  ? "Nothing in motion right now."
                  : activeTab === "completed"
                    ? "No completed visits yet."
                    : "No bookings of any kind. Yet."}
          </p>
        </div>
      ) : (
        <section>
          <h4 className="text-label uppercase tracking-[0.32em] text-taupe-300 mb-5 flex flex-wrap gap-2 justify-between items-center font-medium">
            {TABS.find((t) => t.value === activeTab)?.label}
            <span className="font-mono text-champagne-400">
              {sortedBookings.length.toString().padStart(2, "0")} / VISITS
            </span>
          </h4>
          <div>
            {sortedBookings.map((booking) => (
              <div
                key={booking.id}
                onClick={() => setDetailBooking(booking)}
                className="bg-smoke-900 border border-smoke-700 p-5 sm:px-6 grid grid-cols-2 sm:grid-cols-[80px_1fr_1fr_auto_auto] gap-4 sm:gap-6 items-center mb-px hover:bg-smoke-800 transition-colors cursor-pointer"
              >
                <div className="font-mono text-mono text-taupe-300">
                  {shortDate(booking.startTime)}
                  <strong className="block text-bone-100 font-medium text-[13px]">
                    {shortWeekdayTime(booking.startTime)}
                  </strong>
                </div>
                <div className="font-display font-medium text-[15px] text-bone-100 tracking-[-0.01em]">
                  {clientName(booking).toUpperCase()}
                  <small className="block font-editorial italic font-normal text-[13px] text-bone-200 mt-0.5 normal-case">
                    {booking.service?.name ?? "Unknown service"}
                    {booking.service?.durationMinutes
                      ? ` · ${booking.service.durationMinutes} min`
                      : ""}
                  </small>
                </div>
                <div className="text-label uppercase tracking-[0.18em] text-taupe-300 font-medium text-[11px]">
                  {statusLabel(booking.status)}
                  {booking.client?.email && (
                    <small className="block font-editorial italic font-light text-[12px] tracking-normal normal-case text-bone-200 mt-0.5">
                      {booking.client.email}
                    </small>
                  )}
                </div>
                <div className="font-mono text-mono text-champagne-400 text-[13px] text-right">
                  {formatPrice(booking.totalPriceInCents)}
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  {renderActionButtons(booking)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Detail Dialog */}
      <Dialog
        open={detailBooking !== null}
        onOpenChange={(open) => {
          if (!open) setDetailBooking(null);
        }}
      >
        <DialogContent className="border-smoke-700 bg-smoke-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-bone-100">
              Visit details
            </DialogTitle>
            <DialogDescription className="font-editorial italic text-body-md text-bone-200">
              {detailBooking?.service?.name ?? "Appointment"} &mdash;{" "}
              {detailBooking ? formatDate(detailBooking.startTime) : ""}
            </DialogDescription>
          </DialogHeader>
          {detailBooking && (
            <div className="flex flex-col gap-5 pt-2">
              <DetailRow label="Client">
                <p className="font-display font-medium text-bone-100 tracking-[-0.01em]">
                  {clientName(detailBooking)}
                </p>
                {detailBooking.client?.email && (
                  <p className="font-mono text-mono text-taupe-300 mt-1">
                    {detailBooking.client.email}
                  </p>
                )}
                {detailBooking.client?.phone && (
                  <p className="font-mono text-mono text-taupe-300">
                    {detailBooking.client.phone}
                  </p>
                )}
              </DetailRow>

              <DetailRow label="Service">
                <p className="font-display font-medium text-bone-100 tracking-[-0.01em]">
                  {detailBooking.service?.name ?? "Unknown service"}
                </p>
                {(detailBooking.service?.category ||
                  detailBooking.service?.durationMinutes) && (
                  <p className="font-editorial italic text-body-sm text-bone-200 mt-1">
                    {[
                      detailBooking.service?.category,
                      detailBooking.service?.durationMinutes
                        ? `${detailBooking.service.durationMinutes} min`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </DetailRow>

              <DetailRow label="When">
                <p className="font-display font-medium text-bone-100 tracking-[-0.01em]">
                  {formatDate(detailBooking.startTime)}
                </p>
                <p className="font-mono text-mono text-taupe-300 mt-1">
                  {formatTime(detailBooking.startTime)} &mdash;{" "}
                  {formatTime(detailBooking.endTime)}
                </p>
              </DetailRow>

              {detailBooking.location && (
                <DetailRow label="Where">
                  <p className="font-display font-medium text-bone-100 tracking-[-0.01em]">
                    {detailBooking.location}
                  </p>
                </DetailRow>
              )}

              <DetailRow label="Price">
                <p className="font-mono text-mono text-champagne-400">
                  {formatPrice(detailBooking.totalPriceInCents)}
                </p>
              </DetailRow>

              <DetailRow label="Status">
                <p className="font-mono text-mono text-bone-100">
                  {statusLabel(detailBooking.status)}
                </p>
              </DetailRow>

              {detailBooking.notes && (
                <DetailRow label="Notes">
                  <p className="font-editorial italic text-body-md text-bone-200 leading-relaxed">
                    {detailBooking.notes}
                  </p>
                </DetailRow>
              )}

              {(detailBooking.status === "PENDING" ||
                detailBooking.status === "CONFIRMED" ||
                detailBooking.status === "IN_PROGRESS") && (
                <div className="flex flex-wrap justify-end gap-2 border-t border-smoke-700 pt-4">
                  {detailBooking.status === "PENDING" && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={updatingId === detailBooking.id}
                        onClick={() => {
                          updateStatus(detailBooking.id, "CONFIRMED");
                          setDetailBooking(null);
                        }}
                      >
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        Confirm
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDetailBooking(null);
                          setDeclineBooking(detailBooking);
                        }}
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" />
                        Decline
                      </Button>
                    </>
                  )}
                  {detailBooking.status === "CONFIRMED" && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={updatingId === detailBooking.id}
                        onClick={() => {
                          updateStatus(detailBooking.id, "IN_PROGRESS");
                          setDetailBooking(null);
                        }}
                      >
                        <PlayCircle className="mr-1 h-3.5 w-3.5" />
                        Start
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDetailBooking(null);
                          setDeclineBooking(detailBooking);
                        }}
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    </>
                  )}
                  {detailBooking.status === "IN_PROGRESS" && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={updatingId === detailBooking.id}
                      onClick={() => {
                        updateStatus(detailBooking.id, "COMPLETED");
                        setDetailBooking(null);
                      }}
                    >
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Complete
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Decline / Cancel dialog */}
      <AlertDialog
        open={declineBooking !== null}
        onOpenChange={(open) => {
          if (!open && !declining) {
            setDeclineBooking(null);
            setDeclineReason("");
          }
        }}
      >
        <AlertDialogContent className="border-smoke-700 bg-smoke-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-bone-100">
              {declineBooking?.status === "PENDING"
                ? "Decline visit"
                : "Cancel visit"}
            </AlertDialogTitle>
            <AlertDialogDescription className="font-editorial italic text-body-md text-bone-200">
              {declineBooking?.status === "PENDING" ? "Decline" : "Cancel"} the{" "}
              {declineBooking?.service?.name ?? "appointment"} with{" "}
              {declineBooking ? clientName(declineBooking) : ""}
              {declineBooking
                ? ` on ${formatDate(declineBooking.startTime)}`
                : ""}
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="decline-reason"
              className="text-label uppercase tracking-[0.28em] text-taupe-300 font-medium"
            >
              Reason (optional)
            </label>
            <textarea
              id="decline-reason"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="A short note. Honest is fine."
              rows={3}
              className="w-full bg-smoke-900 border border-smoke-700 px-3 py-2 font-editorial italic text-body-md text-bone-100 placeholder:text-taupe-300 focus-visible:outline-none focus-visible:border-champagne-400 disabled:opacity-50"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={declining}>
              Go back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDecline();
              }}
              disabled={declining}
            >
              {declining
                ? "Processing…"
                : declineBooking?.status === "PENDING"
                  ? "Decline"
                  : "Cancel visit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-label uppercase tracking-[0.28em] text-taupe-300 font-medium text-[10px]">
        {label}
      </p>
      <div>{children}</div>
    </div>
  );
}
