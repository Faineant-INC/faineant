"use client";

import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/topbar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getAdminStats } from "@/lib/data-client";
import { useAuth } from "@/lib/auth";

interface Stats {
  totalUsers: number;
  totalProviders: number;
  totalBookings: number;
  totalRevenue: number;
}

export default function AdminDashboardPage() {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken) loadStats();
  }, [accessToken]);

  async function loadStats() {
    setError(null);
    try {
      setStats(await getAdminStats());
    } catch {
      setError("Failed to load stats. Please try again.");
    }
  }

  const cards: { label: string; value: string | number; numberLabel: string }[] = [
    {
      label: "Total members",
      value: stats?.totalUsers ?? 0,
      numberLabel: "№ 01",
    },
    {
      label: "Practitioners",
      value: stats?.totalProviders ?? 0,
      numberLabel: "№ 02",
    },
    {
      label: "Reservations",
      value: stats?.totalBookings ?? 0,
      numberLabel: "№ 03",
    },
    {
      label: "House revenue",
      value: `$${((stats?.totalRevenue ?? 0) / 100).toFixed(2)}`,
      numberLabel: "№ 04",
    },
  ];

  return (
    <>
      <Topbar />
      <SiteHeader />
      <main className="bg-smoke-900 text-bone-100 min-h-screen">
        <section className="max-w-[1480px] mx-auto px-14 py-24 border-b border-smoke-700">
          <span className="text-label uppercase tracking-[0.32em] text-taupe-300 font-medium">
            № 00 · The Office
          </span>
          <h1 className="font-display display-compressed text-[5rem] leading-[0.94] text-bone-100 mt-4">
            House{" "}
            <em className="font-editorial italic font-light text-champagne-400">
              ledger.
            </em>
          </h1>
          <p className="font-editorial italic font-light text-[22px] leading-snug text-bone-200 mt-8 max-w-[640px]">
            A quiet view of the platform — members, practitioners, reservations,
            revenue. Numbers are live.
          </p>
        </section>

        <section className="max-w-[1480px] mx-auto px-14 py-20">
          {error && (
            <p
              role="alert"
              className="mb-10 border border-smoke-700 bg-smoke-950 px-6 py-4 text-body-sm text-champagne-400 font-mono uppercase tracking-[0.2em]"
            >
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-l border-t border-smoke-700">
            {cards.map((card) => (
              <div
                key={card.label}
                className="border-r border-b border-smoke-700 bg-smoke-900 p-10"
              >
                <span className="font-mono text-mono uppercase tracking-[0.3em] text-taupe-300">
                  {card.numberLabel}
                </span>
                <p className="mt-6 font-display display-compressed text-[3.5rem] leading-none text-bone-100">
                  {card.value}
                </p>
                <p className="mt-6 pt-4 border-t border-smoke-700 text-label uppercase tracking-[0.3em] text-taupe-300 font-medium">
                  {card.label}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
