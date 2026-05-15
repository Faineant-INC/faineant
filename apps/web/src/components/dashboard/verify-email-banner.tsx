"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api-client";

/**
 * Banner shown in the dashboard until the user verifies their email address.
 * Hidden once `user.emailVerified === true`. Allows resend with rate-limit
 * feedback (server enforces 3/hour/IP).
 */
export function VerifyEmailBanner() {
  const { user } = useAuth();
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "sending" }
    | { kind: "sent" }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  if (!user || user.emailVerified) return null;

  async function handleResend() {
    if (!user) return;
    setState({ kind: "sending" });
    try {
      await api.post<{ success: boolean }>("/auth/resend-verification", {
        email: user.email,
      });
      setState({ kind: "sent" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not resend";
      setState({ kind: "error", message });
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-champagne-500/30 bg-smoke-800 px-12 py-4"
    >
      <div className="flex items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-label uppercase tracking-[0.32em] text-champagne-400">
            One quiet step
          </span>
          <p className="font-editorial italic text-body-lg text-bone-100 leading-snug">
            Confirm the address we sent to{" "}
            <span className="text-champagne-300">{user.email}</span>. Bookings
            and payments rest until you do.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {state.kind === "sent" && (
            <span className="font-mono text-mono text-taupe-300">
              SENT &middot; CHECK YOUR INBOX
            </span>
          )}
          {state.kind === "error" && (
            <span className="font-mono text-mono text-oxblood-500">
              {state.message.toUpperCase()}
            </span>
          )}
          <button
            type="button"
            onClick={handleResend}
            disabled={state.kind === "sending" || state.kind === "sent"}
            className="px-4 py-2.5 border border-champagne-500 text-champagne-400 text-label uppercase tracking-[0.28em] font-medium disabled:opacity-50 hover:bg-champagne-500/10 transition-colors"
          >
            {state.kind === "sending" ? "Sending..." : "Resend"}
          </button>
        </div>
      </div>
    </div>
  );
}
