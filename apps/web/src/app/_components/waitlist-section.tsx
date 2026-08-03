"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MARKETING_CONSENT_DISCLOSURE,
  MARKETING_CONSENT_VERSION,
  waitlistSchema,
} from "@faineant/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Status = "idle" | "submitting" | "success" | "error";

type MarketingSubscribeResponse = {
  subscribed?: boolean;
  error?: string;
};

const PUBLIC_MARKETING_ERRORS = new Set([
  "Too many requests. Try again later.",
  "Your address was saved, but the welcome note could not be sent. Try again.",
]);

async function functionErrorMessage(error: unknown): Promise<string> {
  const context =
    typeof error === "object" && error !== null && "context" in error
      ? (error as { context?: unknown }).context
      : null;
  if (context instanceof Response) {
    try {
      const body = (await context.clone().json()) as MarketingSubscribeResponse;
      if (body.error && PUBLIC_MARKETING_ERRORS.has(body.error)) return body.error;
    } catch {
      // Fall through to the safe user-facing message.
    }
  }
  return "We could not save your place. Try again.";
}

export function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const parsed = waitlistSchema.safeParse({
      email,
      source: "homepage",
      referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
      marketingConsent,
      consentVersion: MARKETING_CONSENT_VERSION,
      website,
    });

    if (!parsed.success) {
      setStatus("error");
      setErrorMessage(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
      return;
    }

    setStatus("submitting");
    try {
      const { data, error } = await supabase.functions.invoke<MarketingSubscribeResponse>(
        "marketing-subscribe",
        { body: parsed.data },
      );
      if (error) {
        throw new Error(await functionErrorMessage(error));
      }
      if (!data?.subscribed) throw new Error("We could not save your place. Try again.");
      setSuccessMessage(
        "Your address is saved. If it is new to the list, a welcome note is on its way.",
      );
      setStatus("success");
      setEmail("");
      setMarketingConsent(false);
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  }

  const isSubmitting = status === "submitting";

  return (
    <section
      id="waitlist"
      aria-labelledby="waitlist-heading"
      className="py-16 md:py-24 lg:py-30 border-b border-smoke-700"
    >
      <div className="max-w-[1480px] mx-auto px-5 md:px-10 lg:px-14">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 md:gap-16 lg:gap-24 items-start">
          <div className="flex flex-col gap-6 md:gap-8">
            <span className="font-mono text-mono uppercase tracking-[0.32em] text-taupe-300">
              № 07 · The list
            </span>
            <h2
              id="waitlist-heading"
              className="font-display display-compressed text-[clamp(36px,8vw,64px)] leading-[0.94] text-bone-100"
            >
              Be{" "}
              <em className="font-editorial italic font-light text-champagne-400">first in line</em>{" "}
              when the door opens.
            </h2>
            <p className="font-editorial italic text-body-lg text-bone-200 leading-snug max-w-[44ch]">
              We are inviting a small Chicago circle ahead of public release. Leave an address for a
              welcome note now and occasional news when the calendar opens.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-6 border-t border-taupe-500 pt-8 md:pt-10 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-16"
            aria-describedby="waitlist-privacy"
          >
            {status === "success" ? (
              <div
                role="status"
                aria-live="polite"
                className="flex flex-col gap-4 border border-champagne-400/40 bg-champagne-400/5 px-6 py-8"
              >
                <span className="font-mono text-mono uppercase tracking-[0.32em] text-champagne-400">
                  Received
                </span>
                <p className="font-editorial italic text-editorial text-bone-100">
                  {successMessage}
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  <Label
                    htmlFor="waitlist-email"
                    className="font-mono text-mono uppercase tracking-[0.32em] text-taupe-300"
                  >
                    Email address
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      id="waitlist-email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (status === "error") {
                          setStatus("idle");
                          setErrorMessage("");
                        }
                      }}
                      aria-invalid={status === "error"}
                      aria-describedby={status === "error" ? "waitlist-error" : undefined}
                      disabled={isSubmitting}
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      variant="accent"
                      disabled={isSubmitting || email.trim().length === 0}
                      className="sm:w-auto"
                    >
                      {isSubmitting ? "Sending…" : "Reserve a place"}
                    </Button>
                  </div>
                </div>

                <label className="grid grid-cols-[18px_1fr] gap-3 items-start text-body-sm text-bone-200 leading-relaxed cursor-pointer">
                  <input
                    name="marketingConsent"
                    type="checkbox"
                    required
                    checked={marketingConsent}
                    onChange={(event) => {
                      setMarketingConsent(event.target.checked);
                      if (status === "error") {
                        setStatus("idle");
                        setErrorMessage("");
                      }
                    }}
                    disabled={isSubmitting}
                    className="mt-1 h-4 w-4 rounded-none border border-taupe-500 bg-transparent accent-champagne-400"
                  />
                  <span>
                    {MARKETING_CONSENT_DISCLOSURE} Read the{" "}
                    <Link
                      href="/privacy"
                      className="text-champagne-400 underline underline-offset-4"
                    >
                      Privacy Notice
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/marketing-terms"
                      className="text-champagne-400 underline underline-offset-4"
                    >
                      Email Terms
                    </Link>
                    .
                  </span>
                </label>

                {/* Honeypot — visually hidden, off the AT tree, no autofill */}
                <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                  <label htmlFor="waitlist-website">Website</label>
                  <input
                    id="waitlist-website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                {status === "error" && (
                  <p
                    id="waitlist-error"
                    role="alert"
                    aria-live="assertive"
                    className="font-mono text-mono uppercase tracking-[0.2em] text-oxblood-400"
                  >
                    {errorMessage}
                  </p>
                )}

                <p
                  id="waitlist-privacy"
                  className="font-mono text-mono text-taupe-300 leading-relaxed"
                >
                  We will send a welcome note now, then occasional marketing email. We do not sell
                  your address. Unsubscribe in a single click.
                </p>
              </>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
