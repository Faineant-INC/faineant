"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { listMyAvailability, replaceAvailability } from "@/lib/data-client";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

const DAYS = [
  { short: "Sun", full: "Sunday" },
  { short: "Mon", full: "Monday" },
  { short: "Tue", full: "Tuesday" },
  { short: "Wed", full: "Wednesday" },
  { short: "Thu", full: "Thursday" },
  { short: "Fri", full: "Friday" },
  { short: "Sat", full: "Saturday" },
];

interface Slot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

const DEFAULT_SLOTS: Slot[] = [1, 2, 3, 4, 5, 6].map((day) => ({
  dayOfWeek: day,
  startTime: "09:00",
  endTime: "18:00",
}));

export default function ProviderSchedulePage() {
  const { accessToken } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    setLoading(true);
    listMyAvailability()
      .then((availability) => {
        if (active) {
          setSlots(availability.length > 0 ? availability : DEFAULT_SLOTS);
        }
      })
      .catch(() => {
        if (active) setError("Failed to load your current schedule.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken]);

  function toggleDay(day: number) {
    const exists = slots.find((s) => s.dayOfWeek === day);
    if (exists) {
      setSlots(slots.filter((s) => s.dayOfWeek !== day));
    } else {
      setSlots([
        ...slots,
        { dayOfWeek: day, startTime: "09:00", endTime: "18:00" },
      ]);
    }
  }

  function updateSlot(
    day: number,
    field: "startTime" | "endTime",
    value: string,
  ) {
    setSlots(
      slots.map((s) => (s.dayOfWeek === day ? { ...s, [field]: value } : s)),
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await replaceAvailability(slots);
      setSaved(true);
    } catch {
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const activeDays = new Set(slots.map((s) => s.dayOfWeek));

  function dayHasAvailability(date: Date) {
    return activeDays.has(date.getDay());
  }

  return (
    <div className="px-5 md:px-10 lg:px-14 py-8 md:py-12 flex flex-col gap-8 md:gap-12">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 pb-5 border-b border-smoke-700">
        <h2 className="font-display display-compressed text-[2.625rem] leading-none text-bone-100">
          Your{" "}
          <em className="font-editorial italic font-light text-champagne-400">
            hours.
          </em>
        </h2>
        <p className="font-editorial italic text-body-lg text-bone-200 md:max-w-[340px] md:text-right leading-snug">
          Block windows when you can&rsquo;t see anyone. Default to closed.
        </p>
      </header>

      {error && (
        <div className="border border-smoke-700 bg-smoke-800 px-4 py-3 text-label uppercase tracking-[0.18em] text-bone-200">
          {error}
        </div>
      )}
      {saved && (
        <div className="border border-smoke-700 bg-smoke-800 px-4 py-3 text-label uppercase tracking-[0.18em] text-champagne-400">
          Schedule saved.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-taupe-300" />
        </div>
      ) : (
        <div className="grid gap-9 lg:grid-cols-[1fr_320px]">
          <section>
            <h4 className="text-label uppercase tracking-[0.32em] text-taupe-300 mb-5 flex flex-wrap gap-2 justify-between items-center font-medium">
              Weekly hours
              <span className="font-mono text-champagne-400">
                {slots.length.toString().padStart(2, "0")} / 07 OPEN
              </span>
            </h4>

            <div>
              {DAYS.map((day, i) => {
                const slot = slots.find((s) => s.dayOfWeek === i);
                const isActive = !!slot;
                return (
                  <div
                    key={day.short}
                    className={`border border-smoke-700 px-4 sm:px-6 py-4 grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-4 sm:gap-6 items-center mb-px ${
                      isActive ? "bg-smoke-900" : "bg-smoke-800"
                    }`}
                  >
                    <button
                      onClick={() => toggleDay(i)}
                      className={`px-3 py-2 text-label uppercase tracking-[0.28em] font-medium text-[10px] border ${
                        isActive
                          ? "border-champagne-400 text-champagne-400"
                          : "border-smoke-700 text-taupe-300 hover:text-bone-200"
                      }`}
                    >
                      {day.short}
                    </button>

                    {isActive && slot ? (
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) =>
                            updateSlot(i, "startTime", e.target.value)
                          }
                          className="bg-smoke-900 border border-smoke-700 px-3 py-2 font-mono text-mono text-bone-100 focus-visible:outline-none focus-visible:border-champagne-400"
                        />
                        <span className="font-mono text-mono text-taupe-300">
                          —
                        </span>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) =>
                            updateSlot(i, "endTime", e.target.value)
                          }
                          className="bg-smoke-900 border border-smoke-700 px-3 py-2 font-mono text-mono text-bone-100 focus-visible:outline-none focus-visible:border-champagne-400"
                        />
                      </div>
                    ) : (
                      <span className="font-editorial italic text-body-md text-taupe-300">
                        Closed.
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-5 mt-5 border-t border-smoke-700">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={loading || saving}
              >
                {saving ? "Saving…" : "Save schedule"}
              </Button>
            </div>
          </section>

          <aside>
            <h4 className="text-label uppercase tracking-[0.32em] text-taupe-300 mb-5 font-medium">
              Preview
            </h4>
            <div className="bg-smoke-900 border border-smoke-700 p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{
                  available: dayHasAvailability,
                  unavailable: (date: Date) => !dayHasAvailability(date),
                }}
                modifiersClassNames={{
                  available: "font-medium",
                  unavailable: "opacity-30",
                }}
                disabled={{ before: new Date() }}
                className="mx-auto"
              />
              {selectedDate && (
                <div className="mt-4 pt-4 border-t border-smoke-700">
                  <p className="text-label uppercase tracking-[0.28em] text-taupe-300 font-medium text-[10px]">
                    {selectedDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  {dayHasAvailability(selectedDate) ? (
                    <p className="mt-2 font-mono text-mono text-champagne-400">
                      {
                        slots.find(
                          (s) => s.dayOfWeek === selectedDate.getDay(),
                        )?.startTime
                      }{" "}
                      —{" "}
                      {
                        slots.find(
                          (s) => s.dayOfWeek === selectedDate.getDay(),
                        )?.endTime
                      }
                    </p>
                  ) : (
                    <p className="mt-2 font-editorial italic text-body-md text-taupe-300">
                      Closed.
                    </p>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
