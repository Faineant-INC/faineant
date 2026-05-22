"use client";

import { useState } from "react";
import { waitlistSchema } from "@faineant/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

type Status = "idle" | "submitting" | "success" | "error";

export function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const parsed = waitlistSchema.safeParse({
      email,
      source: "homepage",
      referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
      website,
    });

    if (!parsed.success) {
      setStatus("error");
      setErrorMessage(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch(`${API_URL}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(body?.error?.message ?? "Could not save your email.");
      }
      setStatus("success");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
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
              <em className="font-editorial italic font-light text-champagne-400">
                first in line
              </em>{" "}
              when the door opens.
            </h2>
            <p className="font-editorial italic text-body-lg text-bone-200 leading-snug max-w-[44ch]">
              We are inviting a small Chicago circle ahead of public release. Leave an address;
              we will write once, briefly, when the calendar opens.
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
                  Your address is on the list. We will be in touch — never often, never loud.
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

                {/* Honeypot — visually hidden, off the AT tree, no autofill */}
                <div
                  aria-hidden="true"
                  className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
                >
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
                  One address. No third parties. Unsubscribe in a single click — we believe in
                  doing less, including in your inbox.
                </p>
              </>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
