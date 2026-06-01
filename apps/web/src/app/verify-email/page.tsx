"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";

type VerifyState =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "success"; alreadyVerified: boolean }
  | { kind: "error"; message: string };

function VerifyEmailInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<VerifyState>({ kind: "loading" });

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setState({ kind: "missing" });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await api.post<{
          data: { alreadyVerified: boolean };
        }>("/auth/verify-email", { token });
        if (cancelled) return;
        setState({
          kind: "success",
          alreadyVerified: res.data.alreadyVerified,
        });
        setTimeout(() => {
          if (!cancelled) router.replace("/dashboard");
        }, 2500);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Verification failed";
        setState({ kind: "error", message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <main className="min-h-screen bg-smoke-900 text-bone-100 flex items-center justify-center px-5 py-10 sm:px-6">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-xl border border-smoke-700 bg-smoke-800 p-6 sm:p-10 md:p-12 flex flex-col gap-6">
        <span className="text-label uppercase tracking-[0.32em] text-champagne-400">
          Verify your email
        </span>

        {state.kind === "loading" && (
          <>
            <h1 className="font-display text-[clamp(1.75rem,7vw,2.25rem)] leading-[1.05]">
              One <em className="font-editorial italic font-light text-champagne-400">moment.</em>
            </h1>
            <p className="font-editorial italic text-body-lg text-taupe-300">
              Confirming the address.
            </p>
          </>
        )}

        {state.kind === "missing" && (
          <>
            <h1 className="font-display text-[clamp(1.75rem,7vw,2.25rem)] leading-[1.05]">
              Nothing to <em className="font-editorial italic font-light text-champagne-400">confirm.</em>
            </h1>
            <p className="font-editorial italic text-body-lg text-taupe-300">
              This page expects a verification token. Use the link from your
              email.
            </p>
            <Link
              href="/login"
              className="self-start mt-4 px-6 py-3 bg-bone-100 text-smoke-900 text-label uppercase tracking-[0.28em] font-medium"
            >
              Return to sign in
            </Link>
          </>
        )}

        {state.kind === "success" && (
          <>
            <h1 className="font-display text-[clamp(1.75rem,7vw,2.25rem)] leading-[1.05]">
              {state.alreadyVerified ? (
                <>
                  Already <em className="font-editorial italic font-light text-champagne-400">confirmed.</em>
                </>
              ) : (
                <>
                  Address <em className="font-editorial italic font-light text-champagne-400">confirmed.</em>
                </>
              )}
            </h1>
            <p className="font-editorial italic text-body-lg text-taupe-300">
              Taking you to your dashboard. Nothing urgent.
            </p>
            <Link
              href="/dashboard"
              className="self-start mt-4 px-6 py-3 bg-bone-100 text-smoke-900 text-label uppercase tracking-[0.28em] font-medium"
            >
              Open dashboard now
            </Link>
          </>
        )}

        {state.kind === "error" && (
          <>
            <h1 className="font-display text-[clamp(1.75rem,7vw,2.25rem)] leading-[1.05]">
              That link is <em className="font-editorial italic font-light text-champagne-400">resting.</em>
            </h1>
            <p className="font-editorial italic text-body-lg text-taupe-300">
              {state.message}. You can request a fresh one from the dashboard
              banner after signing in.
            </p>
            <Link
              href="/login"
              className="self-start mt-4 px-6 py-3 bg-bone-100 text-smoke-900 text-label uppercase tracking-[0.28em] font-medium"
            >
              Sign in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-smoke-900 text-bone-100 flex items-center justify-center">
          <p className="font-editorial italic text-body-lg text-taupe-300">
            One moment.
          </p>
        </main>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
