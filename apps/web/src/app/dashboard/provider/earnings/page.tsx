"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getEarnings, startStripeConnect } from "@/lib/data-client";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

interface EarningsData {
  totalEarnings: number;
  payments: {
    id: string;
    providerPayoutInCents: number;
    createdAt: string;
    booking: { startTime: string; service: { name: string } | null } | null;
  }[];
}

export default function ProviderEarningsPage() {
  const { accessToken } = useAuth();
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken) loadEarnings();
  }, [accessToken]);

  async function loadEarnings() {
    setError(null);
    setLoading(true);
    try {
      setEarnings(await getEarnings());
    } catch {
      // Network error on initial load — degrade to empty state
    } finally {
      setLoading(false);
    }
  }

  async function setupStripe() {
    setError(null);
    setConnectingStripe(true);
    try {
      window.location.href = await startStripeConnect();
    } catch {
      setError("Failed to connect to Stripe. Please try again.");
    } finally {
      setConnectingStripe(false);
    }
  }

  const total = earnings ? (earnings.totalEarnings / 100).toFixed(2) : "0.00";

  return (
    <div className="px-5 md:px-10 lg:px-14 py-8 md:py-12 flex flex-col gap-8 md:gap-12">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 pb-5 border-b border-smoke-700">
        <h2 className="font-display display-compressed text-[2.625rem] leading-none text-bone-100">
          What you{" "}
          <em className="font-editorial italic font-light text-champagne-400">
            earned.
          </em>
        </h2>
        <p className="font-editorial italic text-body-lg text-bone-200 md:max-w-[340px] md:text-right leading-snug">
          Faineant takes 5%. Stripe takes the usual fees. The rest is yours.
        </p>
      </header>

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
          <section className="grid gap-px sm:grid-cols-2 bg-smoke-700">
            <div className="bg-smoke-900 p-6 sm:p-9 flex flex-col gap-3">
              <p className="text-label uppercase tracking-[0.32em] text-taupe-300 font-medium">
                Total, to date
              </p>
              <p className="font-display display-compressed text-[clamp(2rem,7vw,3rem)] leading-none text-bone-100">
                ${total}
              </p>
              <p className="font-editorial italic text-body-md text-bone-200">
                After Faineant. Before tax.
              </p>
            </div>
            <div className="bg-smoke-900 p-6 sm:p-9 flex flex-col gap-3">
              <p className="text-label uppercase tracking-[0.32em] text-taupe-300 font-medium">
                Payouts
              </p>
              <p className="font-editorial italic text-body-md text-bone-200">
                Stripe handles the transfers. Manage your account there.
              </p>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={setupStripe}
                  disabled={connectingStripe}
                >
                  {connectingStripe ? "Opening…" : "Manage Stripe"}
                </Button>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-label uppercase tracking-[0.32em] text-taupe-300 mb-5 flex flex-wrap gap-2 justify-between items-center font-medium">
              Ledger
              <span className="font-mono text-champagne-400">
                {(earnings?.payments.length ?? 0).toString().padStart(2, "0")} /
                ENTRIES
              </span>
            </h4>

            {!earnings?.payments.length ? (
              <div className="bg-smoke-900 border border-smoke-700 p-6 sm:p-9 text-center">
                <p className="font-editorial italic text-body-lg text-bone-200">
                  Nothing here yet. Completed visits will leave a mark.
                </p>
              </div>
            ) : (
              <div>
                {earnings.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="bg-smoke-900 border border-smoke-700 p-5 sm:px-6 grid grid-cols-[1fr_auto_auto] gap-4 sm:gap-6 items-center mb-px"
                  >
                    <div className="font-display font-medium text-[15px] text-bone-100 tracking-[-0.01em]">
                      {payment.booking?.service?.name ?? "Unknown service"}
                      <small className="block font-editorial italic font-normal text-[13px] text-bone-200 mt-0.5">
                        {payment.booking?.startTime
                          ? new Date(
                              payment.booking.startTime,
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </small>
                    </div>
                    <div className="text-label uppercase tracking-[0.18em] text-taupe-300 font-medium text-[11px]">
                      Payout
                    </div>
                    <div className="font-mono text-mono text-champagne-400 text-[13px] text-right">
                      +${(payment.providerPayoutInCents / 100).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
