"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Link2,
  Unlink,
  RefreshCw,
  Rss,
  Loader2,
} from "lucide-react";

interface CalendarConnectionData {
  id: string;
  provider: "GOOGLE" | "ICS_FEED";
  externalId: string | null;
  feedUrl: string | null;
  lastSyncedAt: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { externalEvents: number };
}

function CalendarSettingsPageInner() {
  const { accessToken } = useAuth();
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<CalendarConnectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [icsUrl, setIcsUrl] = useState("");
  const [icsLoading, setIcsLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    if (!accessToken) return;
    setError(null);
    try {
      const res = await api.get<{ data: CalendarConnectionData[] }>(
        "/calendar/connections",
        { token: accessToken },
      );
      setConnections(res.data);
    } catch {
      // Network error on initial load — degrade to empty state
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  useEffect(() => {
    if (searchParams.get("calendar") === "connected") {
      setSuccessMessage("Google Calendar connected.");
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  }, [searchParams]);

  async function connectGoogle() {
    setError(null);
    try {
      const res = await api.get<{ data: { url: string } }>(
        "/calendar/google/connect",
        { token: accessToken! },
      );
      window.location.href = res.data.url;
    } catch {
      setError("Failed to start Google Calendar connection.");
    }
  }

  async function addIcsFeed() {
    if (!icsUrl.trim()) return;
    setIcsLoading(true);
    setError(null);
    try {
      const res = await api.post<{ data: { eventsImported: number } }>(
        "/calendar/ics",
        { feedUrl: icsUrl },
        { token: accessToken! },
      );
      setIcsUrl("");
      setSuccessMessage(
        `Feed connected. ${res.data.eventsImported} events imported.`,
      );
      setTimeout(() => setSuccessMessage(null), 5000);
      await loadConnections();
    } catch {
      setError("Failed to add calendar feed. Check the URL and try again.");
    } finally {
      setIcsLoading(false);
    }
  }

  async function triggerSync(connectionId: string) {
    setSyncingId(connectionId);
    setError(null);
    try {
      await api.post(
        `/calendar/sync/${connectionId}`,
        {},
        { token: accessToken! },
      );
      setSuccessMessage("Calendar synced.");
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadConnections();
    } catch {
      setError("Failed to sync calendar.");
    } finally {
      setSyncingId(null);
    }
  }

  async function disconnect(connectionId: string) {
    setError(null);
    try {
      await api.delete(`/calendar/connections/${connectionId}`, {
        token: accessToken!,
      });
      await loadConnections();
    } catch {
      setError("Failed to disconnect calendar.");
    }
  }

  const googleConnection = connections.find((c) => c.provider === "GOOGLE");
  const icsConnection = connections.find((c) => c.provider === "ICS_FEED");

  return (
    <div className="px-5 md:px-10 lg:px-14 py-8 md:py-12 flex flex-col gap-8 md:gap-12">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 pb-5 border-b border-smoke-700">
        <h2 className="font-display display-compressed text-[2.625rem] leading-none text-bone-100">
          House{" "}
          <em className="font-editorial italic font-light text-champagne-400">
            rules.
          </em>
        </h2>
        <p className="font-editorial italic text-body-lg text-bone-200 md:max-w-[340px] md:text-right leading-snug">
          Cancellation, payouts, account.
        </p>
      </header>

      {successMessage && (
        <div className="border border-smoke-700 bg-smoke-800 px-4 py-3 text-label uppercase tracking-[0.18em] text-champagne-400">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="border border-smoke-700 bg-smoke-800 px-4 py-3 text-label uppercase tracking-[0.18em] text-bone-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-taupe-300" />
        </div>
      ) : (
        <>
          <section className="bg-smoke-900 border border-smoke-700">
            <div className="p-6 border-b border-smoke-700 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center border border-smoke-700 bg-smoke-800">
                  <Calendar className="h-5 w-5 text-champagne-400" />
                </div>
                <div>
                  <h3 className="font-display font-medium text-[18px] text-bone-100 tracking-[-0.01em]">
                    Google Calendar
                  </h3>
                  <p className="font-editorial italic text-body-md text-bone-200 mt-1 max-w-xl">
                    Two-way. External events block your Faineant availability;
                    Faineant visits land in Google Calendar.
                  </p>
                </div>
              </div>
              {googleConnection && (
                <span className="text-label uppercase tracking-[0.28em] text-champagne-400 font-medium text-[10px] border border-champagne-400 px-3 py-1.5 shrink-0">
                  Connected
                </span>
              )}
            </div>

            <div className="p-6">
              {googleConnection ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border border-smoke-700 bg-smoke-800 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-mono text-mono text-bone-100 truncate">
                      {googleConnection.externalId || "Primary calendar"}
                    </p>
                    <p className="text-label uppercase tracking-[0.18em] text-taupe-300 mt-1">
                      {googleConnection._count?.externalEvents ?? 0} events
                      {googleConnection.lastSyncedAt &&
                        ` · last sync ${new Date(googleConnection.lastSyncedAt).toLocaleString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => triggerSync(googleConnection.id)}
                      disabled={syncingId === googleConnection.id}
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${syncingId === googleConnection.id ? "animate-spin" : ""}`}
                      />
                      Sync
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => disconnect(googleConnection.id)}
                    >
                      <Unlink className="h-3.5 w-3.5" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="primary" onClick={connectGoogle} className="gap-2">
                  <Link2 className="h-4 w-4" />
                  Connect Google Calendar
                </Button>
              )}
            </div>
          </section>

          <section className="bg-smoke-900 border border-smoke-700">
            <div className="p-6 border-b border-smoke-700 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center border border-smoke-700 bg-smoke-800">
                  <Rss className="h-5 w-5 text-champagne-400" />
                </div>
                <div>
                  <h3 className="font-display font-medium text-[18px] text-bone-100 tracking-[-0.01em]">
                    Calendar feed (ICS)
                  </h3>
                  <p className="font-editorial italic text-body-md text-bone-200 mt-1 max-w-xl">
                    Booksy, Vagaro, Acuity, Apple. Anything that exports an
                    iCal feed. Read-only.
                  </p>
                </div>
              </div>
              {icsConnection && (
                <span className="text-label uppercase tracking-[0.28em] text-champagne-400 font-medium text-[10px] border border-champagne-400 px-3 py-1.5 shrink-0">
                  Connected
                </span>
              )}
            </div>

            <div className="p-6">
              {icsConnection ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border border-smoke-700 bg-smoke-800 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-mono text-bone-100 truncate">
                      {icsConnection.feedUrl}
                    </p>
                    <p className="text-label uppercase tracking-[0.18em] text-taupe-300 mt-1">
                      {icsConnection._count?.externalEvents ?? 0} events
                      {icsConnection.lastSyncedAt &&
                        ` · last sync ${new Date(icsConnection.lastSyncedAt).toLocaleString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => triggerSync(icsConnection.id)}
                      disabled={syncingId === icsConnection.id}
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${syncingId === icsConnection.id ? "animate-spin" : ""}`}
                      />
                      Sync
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => disconnect(icsConnection.id)}
                    >
                      <Unlink className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="font-editorial italic text-body-md text-bone-200">
                    Find your feed URL in your booking app&rsquo;s settings &mdash;
                    usually under &ldquo;Calendar Export,&rdquo; &ldquo;Sync,&rdquo;
                    or &ldquo;iCal.&rdquo;
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="https://calendar.booksy.com/feed/..."
                      value={icsUrl}
                      onChange={(e) => setIcsUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="primary"
                      onClick={addIcsFeed}
                      disabled={icsLoading || !icsUrl.trim()}
                      className="gap-2 shrink-0"
                    >
                      {icsLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Rss className="h-4 w-4" />
                      )}
                      Import feed
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="border-t border-smoke-700 pt-8">
            <h4 className="text-label uppercase tracking-[0.32em] text-taupe-300 mb-5 font-medium">
              How sync works
            </h4>
            <div className="grid gap-px sm:grid-cols-3 bg-smoke-700">
              {[
                {
                  title: "Blocks your time",
                  desc: "External events block those windows. Clients only see what’s genuinely free.",
                },
                {
                  title: "Writes Faineant visits",
                  desc: "Faineant bookings appear in Google Calendar automatically. Google only.",
                },
                {
                  title: "Refreshes every 15",
                  desc: "Google syncs in real time via push. ICS feeds check every 15 minutes.",
                },
              ].map((item) => (
                <div key={item.title} className="bg-smoke-900 p-5">
                  <p className="font-display font-medium text-[14px] text-bone-100 tracking-[-0.01em]">
                    {item.title}
                  </p>
                  <p className="mt-2 font-editorial italic text-body-sm text-bone-200 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default function CalendarSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 font-editorial italic text-body-md text-taupe-300">
          Loading…
        </div>
      }
    >
      <CalendarSettingsPageInner />
    </Suspense>
  );
}
