"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { NEIGHBOURHOODS, type Neighbourhood } from "@faineant/shared";
import { useAuth } from "@/lib/auth";
import { getMyProfileDetails, updateMyProfile } from "@/lib/data-client";

interface NotificationPrefs {
  reminders: boolean;
  rebooking: boolean;
  newsletter: boolean;
}

export default function ClientProfilePage() {
  const { user, accessToken, isLoading } = useAuth();

  const [form, setForm] = useState<{
    firstName: string;
    lastName: string;
    streetAddress: string;
    neighbourhood: Neighbourhood | "";
  }>({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    streetAddress: "",
    neighbourhood: "",
  });
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    reminders: true,
    rebooking: true,
    newsletter: false,
  });
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    setLoadingProfile(true);
    getMyProfileDetails()
      .then((profile) => {
        setForm({
          firstName: profile.firstName,
          lastName: profile.lastName,
          streetAddress: profile.streetAddress,
          neighbourhood: profile.neighbourhood as Neighbourhood | "",
        });
        setPrefs({
          reminders: profile.notificationReminders,
          rebooking: profile.notificationRebooking,
          newsletter: profile.notificationNewsletter,
        });
      })
      .catch(() => setError("Couldn't load your saved details."))
      .finally(() => setLoadingProfile(false));
  }, [accessToken]);

  async function handleSave() {
    if (!accessToken) return;
    setSaving(true);
    setMessage("");
    setError(null);
    try {
      await updateMyProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        streetAddress: form.streetAddress,
        neighbourhood: form.neighbourhood,
        notificationReminders: prefs.reminders,
        notificationRebooking: prefs.rebooking,
        notificationNewsletter: prefs.newsletter,
      });
      setMessage("Saved.");
    } catch {
      setError("Couldn't save. Try again in a moment.");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || loadingProfile) {
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
              <option value="" className="bg-smoke-900 text-bone-100">
                Select a neighbourhood
              </option>
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
        <div className="bg-smoke-900 border border-smoke-700 p-6 sm:p-9">
          <p className="font-editorial italic font-light text-bone-200">
            No payment method is stored. Secure card setup will appear here
            after the house payment account is connected.
          </p>
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
