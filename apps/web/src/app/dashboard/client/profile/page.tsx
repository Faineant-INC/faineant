"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { NEIGHBOURHOODS, type Neighbourhood } from "@faineant/shared";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api-client";

interface NotificationPrefs {
  reminders: boolean;
  rebooking: boolean;
  newsletter: boolean;
}

export default function ClientProfilePage() {
  const { user, accessToken, isLoading } = useAuth();

  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    streetAddress: "",
    neighbourhood: NEIGHBOURHOODS[0] as Neighbourhood,
  });
  // TODO(impl): load real notification preferences from /users/me/preferences
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    reminders: true,
    rebooking: true,
    newsletter: false,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!accessToken) return;
    setSaving(true);
    setMessage("");
    setError(null);
    try {
      // TODO(impl): swap to a dedicated /users/me endpoint that accepts address +
      // neighbourhood + notification prefs. For now we save name only.
      await api.put(
        "/users/me",
        { firstName: form.firstName, lastName: form.lastName },
        { token: accessToken },
      );
      setMessage("Saved.");
    } catch {
      setError("Couldn't save. Try again in a moment.");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-taupe-300" />
      </div>
    );
  }

  return (
    <div className="px-5 md:px-10 lg:px-14 py-8 md:py-12 flex flex-col gap-8 md:gap-12">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 pb-5 border-b border-smoke-700">
        <h2 className="font-display text-[clamp(1.75rem,5vw,2.625rem)] leading-none text-bone-100">
          Your{" "}
          <em className="font-editorial italic font-light text-champagne-400">
            details.
          </em>
        </h2>
        <p className="font-editorial italic text-body-lg text-bone-200 md:max-w-[340px] md:text-right leading-snug">
          Where to find you, what to bring, how to reach out.
        </p>
      </header>

      {error && (
        <div className="border border-smoke-700 bg-smoke-800 px-4 py-3 text-label uppercase tracking-[0.18em] text-bone-200">
          {error}
        </div>
      )}
      {message && (
        <div className="border border-smoke-700 bg-smoke-800 px-4 py-3 font-mono text-mono text-champagne-400">
          {message}
        </div>
      )}

      {/* IDENTITY */}
      <section>
        <h4 className="text-label uppercase tracking-[0.32em] text-taupe-300 mb-5 font-medium">
          Identity
        </h4>
        <div className="bg-smoke-900 border border-smoke-700 p-6 sm:p-9 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="firstName"
              className="text-label uppercase tracking-[0.28em] text-taupe-300 font-medium"
            >
              First name
            </label>
            <input
              id="firstName"
              value={form.firstName}
              onChange={(e) =>
                setForm((f) => ({ ...f, firstName: e.target.value }))
              }
              className="bg-transparent border-b border-smoke-700 px-0 py-2 font-display text-bone-100 text-[1.125rem] focus:outline-none focus:border-champagne-400"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="lastName"
              className="text-label uppercase tracking-[0.28em] text-taupe-300 font-medium"
            >
              Last name
            </label>
            <input
              id="lastName"
              value={form.lastName}
              onChange={(e) =>
                setForm((f) => ({ ...f, lastName: e.target.value }))
              }
              className="bg-transparent border-b border-smoke-700 px-0 py-2 font-display text-bone-100 text-[1.125rem] focus:outline-none focus:border-champagne-400"
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label
              htmlFor="email"
              className="text-label uppercase tracking-[0.28em] text-taupe-300 font-medium"
            >
              Email
            </label>
            <input
              id="email"
              value={user?.email || ""}
              disabled
              className="bg-transparent border-b border-smoke-700 px-0 py-2 font-mono text-mono text-bone-200 cursor-not-allowed"
            />
          </div>
        </div>
      </section>

      {/* ADDRESS */}
      <section>
        <h4 className="text-label uppercase tracking-[0.32em] text-taupe-300 mb-5 font-medium flex items-center justify-between">
          Where they should knock
          <span className="font-editorial italic font-light text-bone-200 normal-case tracking-normal text-[0.95rem]">
            She arrives at two. You don&rsquo;t have to.
          </span>
        </h4>
        <div className="bg-smoke-900 border border-smoke-700 p-6 sm:p-9 grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-6">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="streetAddress"
              className="text-label uppercase tracking-[0.28em] text-taupe-300 font-medium"
            >
              Street address
            </label>
            <input
              id="streetAddress"
              value={form.streetAddress}
              onChange={(e) =>
                setForm((f) => ({ ...f, streetAddress: e.target.value }))
              }
              placeholder="845 W Randolph St, Apt 4"
              className="bg-transparent border-b border-smoke-700 px-0 py-2 font-display text-bone-100 text-[1.125rem] placeholder:text-taupe-300/60 focus:outline-none focus:border-champagne-400"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="neighbourhood"
              className="text-label uppercase tracking-[0.28em] text-taupe-300 font-medium"
            >
              Neighbourhood
            </label>
            <select
              id="neighbourhood"
              value={form.neighbourhood}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  neighbourhood: e.target.value as Neighbourhood,
                }))
              }
              className="bg-transparent border-b border-smoke-700 px-0 py-2 font-display text-bone-100 text-[1.125rem] focus:outline-none focus:border-champagne-400"
            >
              {NEIGHBOURHOODS.map((n) => (
                <option key={n} value={n} className="bg-smoke-900 text-bone-100">
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* PAYMENT */}
      <section>
        <h4 className="text-label uppercase tracking-[0.32em] text-taupe-300 mb-5 font-medium">
          Card on file
        </h4>
        <div className="bg-smoke-900 border border-smoke-700 p-6 sm:p-9 flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
          <div className="flex flex-wrap items-center gap-3 md:gap-6">
            <span className="font-mono text-mono text-bone-100 tracking-[0.2em] text-[1.125rem]">
              &bull; &bull; &bull; &bull; &nbsp; &bull; &bull; &bull; &bull;
              &nbsp; &bull; &bull; &bull; &bull; &nbsp; 4242
            </span>
            <span className="font-editorial italic font-light text-bone-200">
              Visa, exp 04/29.
            </span>
          </div>
          {/* TODO(impl): wire to Stripe customer portal / setup intent */}
          <button
            type="button"
            className="px-3.5 py-2 border border-smoke-700 text-label uppercase tracking-[0.28em] text-bone-200 font-medium text-[10px]"
          >
            Replace
          </button>
        </div>
      </section>

      {/* NOTIFICATIONS */}
      <section>
        <h4 className="text-label uppercase tracking-[0.32em] text-taupe-300 mb-5 font-medium">
          Notifications
        </h4>
        <div className="bg-smoke-900 border border-smoke-700 divide-y divide-smoke-700">
          {[
            {
              key: "reminders" as const,
              label: "Visit reminders",
              hint: "The day before, the morning of. Nothing more.",
            },
            {
              key: "rebooking" as const,
              label: "Quiet rebooking",
              hint: "When a practitioner you trust has a window open.",
            },
            {
              key: "newsletter" as const,
              label: "The occasional letter",
              hint: "A few times a year. Slow reading.",
            },
          ].map((row) => (
            <label
              key={row.key}
              htmlFor={`pref-${row.key}`}
              className="flex items-center justify-between gap-6 p-6 cursor-pointer hover:bg-smoke-800 transition-colors"
            >
              <div>
                <div className="font-display font-medium text-[15px] text-bone-100">
                  {row.label}
                </div>
                <div className="font-editorial italic font-light text-[13px] text-bone-200 mt-0.5">
                  {row.hint}
                </div>
              </div>
              <input
                id={`pref-${row.key}`}
                type="checkbox"
                checked={prefs[row.key]}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, [row.key]: e.target.checked }))
                }
                className="h-4 w-4 accent-champagne-400 cursor-pointer"
              />
            </label>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-bone-100 text-smoke-900 text-label uppercase tracking-[0.28em] font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}
