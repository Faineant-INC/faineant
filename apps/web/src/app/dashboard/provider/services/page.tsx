"use client";

import { useState, useEffect, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { SERVICE_CATEGORY_LABELS } from "@faineant/shared";
import { Loader2 } from "lucide-react";

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  durationMinutes: number;
  priceInCents: number;
  isActive: boolean;
}

export default function ProviderServicesPage() {
  const { accessToken } = useAuth();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "HAIRCUT",
    durationMinutes: "45",
    priceInCents: "",
  });

  useEffect(() => {
    if (accessToken) loadServices();
  }, [accessToken]);

  async function loadServices() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.get<{ data: ServiceItem[] }>("/services/mine", {
        token: accessToken!,
      });
      setServices(res.data);
    } catch {
      // Network error on initial load — degrade to empty state
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post(
        "/services",
        {
          name: form.name,
          description: form.description || undefined,
          category: form.category,
          durationMinutes: parseInt(form.durationMinutes),
          priceInCents: Math.round(parseFloat(form.priceInCents) * 100),
        },
        { token: accessToken! },
      );
      setShowForm(false);
      setForm({
        name: "",
        description: "",
        category: "HAIRCUT",
        durationMinutes: "45",
        priceInCents: "",
      });
      loadServices();
    } catch {
      setError("Failed to save changes. Please try again.");
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
            menu.
          </em>
        </h2>
        <p className="font-editorial italic text-body-lg text-bone-200 md:max-w-[340px] md:text-right leading-snug">
          Six rituals or fewer. Curated like a tasting card.
        </p>
      </header>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h4 className="text-label uppercase tracking-[0.32em] text-taupe-300 font-medium">
          Offerings{" "}
          <span className="font-mono text-champagne-400 ml-2">
            {services.length.toString().padStart(2, "0")} / LISTED
          </span>
        </h4>
        <Button
          variant={showForm ? "outline" : "primary"}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "Add a ritual"}
        </Button>
      </div>

      {error && (
        <div className="border border-smoke-700 bg-smoke-800 px-4 py-3 text-label uppercase tracking-[0.18em] text-bone-200">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-smoke-900 border border-smoke-700 p-6 flex flex-col gap-4 max-w-3xl"
        >
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="serviceName"
              className="text-label uppercase tracking-[0.28em] text-taupe-300 font-medium"
            >
              Name
            </Label>
            <Input
              id="serviceName"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Classic fade"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="serviceDescription"
              className="text-label uppercase tracking-[0.28em] text-taupe-300 font-medium"
            >
              Description
            </Label>
            <Input
              id="serviceDescription"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Optional. Honest."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="category"
                className="text-label uppercase tracking-[0.28em] text-taupe-300 font-medium"
              >
                Category
              </Label>
              <select
                id="category"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                className="bg-smoke-900 border border-smoke-700 px-3 py-2 font-mono text-mono text-bone-100 focus-visible:outline-none focus-visible:border-champagne-400"
              >
                {Object.entries(SERVICE_CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key} className="bg-smoke-900">
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="duration"
                className="text-label uppercase tracking-[0.28em] text-taupe-300 font-medium"
              >
                Duration (min)
              </Label>
              <Input
                id="duration"
                type="number"
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, durationMinutes: e.target.value }))
                }
                min={15}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="price"
                className="text-label uppercase tracking-[0.28em] text-taupe-300 font-medium"
              >
                Price ($)
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={form.priceInCents}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priceInCents: e.target.value }))
                }
                placeholder="35.00"
                required
              />
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t border-smoke-700">
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? "Adding…" : "Add ritual"}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-taupe-300" />
        </div>
      ) : services.length === 0 ? (
        <div className="bg-smoke-900 border border-smoke-700 p-6 sm:p-9 text-center">
          <p className="font-editorial italic text-body-lg text-bone-200">
            Nothing on the menu yet. Start with one. The one you do best.
          </p>
        </div>
      ) : (
        <div>
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-smoke-900 border border-smoke-700 p-5 sm:px-6 grid grid-cols-[1fr_auto_auto_auto] gap-3 sm:gap-6 items-center mb-px"
            >
              <div>
                <div className="font-display font-medium text-[15px] text-bone-100 tracking-[-0.01em]">
                  {service.name}
                </div>
                {service.description && (
                  <div className="font-editorial italic text-body-sm text-bone-200 mt-0.5">
                    {service.description}
                  </div>
                )}
              </div>
              <div className="text-label uppercase tracking-[0.18em] text-taupe-300 font-medium text-[11px]">
                {SERVICE_CATEGORY_LABELS[
                  service.category as keyof typeof SERVICE_CATEGORY_LABELS
                ] ?? service.category}
                <small className="block font-editorial italic font-light text-[12px] tracking-normal normal-case text-bone-200 mt-0.5">
                  {service.durationMinutes} min
                </small>
              </div>
              <div className="font-mono text-mono text-champagne-400 text-[13px] text-right">
                ${(service.priceInCents / 100).toFixed(2)}
              </div>
              <div
                className={`text-label uppercase tracking-[0.28em] font-medium text-[10px] px-3 py-1.5 border ${
                  service.isActive
                    ? "border-champagne-400 text-champagne-400"
                    : "border-smoke-700 text-taupe-300"
                }`}
              >
                {service.isActive ? "Live" : "Hidden"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
