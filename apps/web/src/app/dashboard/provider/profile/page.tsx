"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api-client";
import { Loader2 } from "lucide-react";

export default function ProviderProfilePage() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    bio: "",
    businessName: "",
    address: "",
    serviceRadius: "25",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [accessToken]);

  async function loadProfile() {
    setError(null);
    try {
      const res = await api.get<{
        data: {
          bio?: string;
          businessName?: string;
          address?: string;
          serviceRadius?: number;
        };
      }>("/providers/me", { token: accessToken! });
      const data = res.data;
      setForm({
        bio: data?.bio ?? "",
        businessName: data?.businessName ?? "",
        address: data?.address ?? "",
        serviceRadius: String(data?.serviceRadius ?? 25),
      });
    } catch {
      // Network error on initial load — degrade to empty state
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    setError(null);
    try {
      await api.put(
        "/providers/me",
        {
          bio: form.bio || undefined,
          businessName: form.businessName || undefined,
          address: form.address || undefined,
          serviceRadius: parseFloat(form.serviceRadius),
        },
        { token: accessToken! },
      );
      setMessage("Saved.");
    } catch {
      setError("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-5 md:px-10 lg:px-14 py-8 md:py-12 flex flex-col gap-8 md:gap-12">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 pb-5 border-b border-smoke-700">
        <h2 className="font-display display-compressed text-[2.625rem] leading-none text-bone-100">
          Your{" "}
          <em className="font-editorial italic font-light text-champagne-400">
            profile.
          </em>
        </h2>
        <p className="font-editorial italic text-body-lg text-bone-200 md:max-w-[340px] md:text-right leading-snug">
          How clients see you in the directory. Edit slowly.
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
        <section className="max-w-2xl">
          <div className="bg-smoke-900 border border-smoke-700 p-6 sm:p-9 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="businessName"
                className="text-label uppercase tracking-[0.28em] text-taupe-300 font-medium"
              >
                Practice name
              </Label>
              <Input
                id="businessName"
                value={form.businessName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, businessName: e.target.value }))
                }
                placeholder="e.g. Marcus Cuts"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="bio"
                className="text-label uppercase tracking-[0.28em] text-taupe-300 font-medium"
              >
                Bio
              </Label>
              <textarea
                id="bio"
                value={form.bio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bio: e.target.value }))
                }
                rows={5}
                className="w-full bg-smoke-900 border border-smoke-700 px-4 py-3 font-editorial italic text-body-md text-bone-100 placeholder:text-taupe-300 focus-visible:outline-none focus-visible:border-champagne-400"
                placeholder="A few honest sentences. Where you trained, what you care about."
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="address"
                className="text-label uppercase tracking-[0.28em] text-taupe-300 font-medium"
              >
                Address
              </Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="City, state"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="serviceRadius"
                className="text-label uppercase tracking-[0.28em] text-taupe-300 font-medium"
              >
                Service radius (miles)
              </Label>
              <Input
                id="serviceRadius"
                type="number"
                value={form.serviceRadius}
                onChange={(e) =>
                  setForm((f) => ({ ...f, serviceRadius: e.target.value }))
                }
              />
            </div>

            {message && (
              <p className="font-mono text-mono text-champagne-400">
                {message}
              </p>
            )}

            <div className="flex justify-end pt-2 border-t border-smoke-700">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={loading || saving}
              >
                {saving ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
