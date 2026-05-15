"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Uploader } from "@/components/uploader";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

interface PortfolioItemData {
  id: string;
  imageUrl: string;
  caption: string | null;
}

export default function ProviderPortfolioPage() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<PortfolioItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ imageUrl: "", caption: "" });

  useEffect(() => {
    if (accessToken) loadPortfolio();
  }, [accessToken]);

  async function loadPortfolio() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.get<{ data: PortfolioItemData[] }>(
        "/providers/me/portfolio",
        { token: accessToken! },
      );
      setItems(res.data);
    } catch {
      // Network error on initial load — degrade to empty state
    } finally {
      setLoading(false);
    }
  }

  async function addItem() {
    setError(null);
    setSaving(true);
    try {
      await api.post(
        "/providers/me/portfolio",
        {
          imageUrl: form.imageUrl,
          caption: form.caption || undefined,
        },
        { token: accessToken! },
      );
      setShowForm(false);
      setForm({ imageUrl: "", caption: "" });
      loadPortfolio();
    } catch {
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id: string) {
    setError(null);
    setDeletingId(id);
    try {
      await api.delete(`/providers/me/portfolio/${id}`, {
        token: accessToken!,
      });
      loadPortfolio();
    } catch {
      setError("Failed to delete portfolio item. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-12 px-14 flex flex-col gap-12">
      <header className="flex justify-between items-end pb-5 border-b border-smoke-700">
        <h2 className="font-display display-compressed text-[2.625rem] leading-none text-bone-100">
          Your{" "}
          <em className="font-editorial italic font-light text-champagne-400">
            work.
          </em>
        </h2>
        <p className="font-editorial italic text-body-lg text-bone-200 max-w-[340px] text-right leading-snug">
          Editorial photography from the visits you&rsquo;ve booked. Clients see
          this on your profile.
        </p>
      </header>

      <div className="flex justify-between items-center">
        <h4 className="text-label uppercase tracking-[0.32em] text-taupe-300 font-medium">
          Collection{" "}
          <span className="font-mono text-champagne-400 ml-2">
            {items.length.toString().padStart(2, "0")} / FRAMES
          </span>
        </h4>
        <Button
          variant={showForm ? "outline" : "primary"}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "Add a frame"}
        </Button>
      </div>

      {error && (
        <div className="border border-smoke-700 bg-smoke-800 px-4 py-3 text-label uppercase tracking-[0.18em] text-bone-200">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-smoke-900 border border-smoke-700 p-6 flex flex-col gap-4 max-w-2xl">
          <div className="flex flex-col gap-2">
            <Label className="text-label uppercase tracking-[0.28em] text-taupe-300 font-medium">
              Image
            </Label>
            {form.imageUrl ? (
              <div className="relative aspect-square max-w-xs overflow-hidden bg-smoke-800 border border-smoke-700">
                <img
                  src={form.imageUrl}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                  className="absolute top-2 right-2 bg-smoke-900/80 px-2 py-1 text-label uppercase tracking-[0.24em] text-bone-200 hover:text-champagne-400"
                >
                  Replace
                </button>
              </div>
            ) : (
              <Uploader
                purpose="portfolio"
                label="Drop a portfolio image"
                onUploaded={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="caption"
              className="text-label uppercase tracking-[0.28em] text-taupe-300 font-medium"
            >
              Caption
            </Label>
            <Input
              id="caption"
              value={form.caption}
              onChange={(e) =>
                setForm((f) => ({ ...f, caption: e.target.value }))
              }
              placeholder="A few words. Optional."
            />
          </div>
          <div className="flex justify-end pt-2 border-t border-smoke-700">
            <Button
              variant="primary"
              onClick={addItem}
              disabled={saving || !form.imageUrl.trim()}
            >
              {saving ? "Adding…" : "Add to portfolio"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-taupe-300" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-smoke-900 border border-smoke-700 p-9 text-center">
          <p className="font-editorial italic text-body-lg text-bone-200">
            No frames yet. The first one is the hardest.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-px bg-smoke-700 sm:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative aspect-square overflow-hidden bg-smoke-900"
            >
              <img
                src={item.imageUrl}
                alt={item.caption || ""}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-smoke-900/85 via-smoke-900/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex w-full items-end justify-between gap-3 p-4">
                  <span className="font-editorial italic text-body-sm text-bone-100">
                    {item.caption}
                  </span>
                  <button
                    onClick={() => deleteItem(item.id)}
                    disabled={deletingId === item.id}
                    className="text-label uppercase tracking-[0.28em] text-bone-200 font-medium text-[10px] hover:text-champagne-400 disabled:opacity-50"
                  >
                    {deletingId === item.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
