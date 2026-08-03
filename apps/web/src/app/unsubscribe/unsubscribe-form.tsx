"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Status = "idle" | "submitting" | "success" | "error";

export function UnsubscribeForm({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>("idle");

  async function unsubscribe() {
    if (!token) {
      setStatus("error");
      return;
    }
    setStatus("submitting");
    const { data, error } = await supabase.functions.invoke<{
      unsubscribed?: boolean;
    }>("marketing-subscribe", {
      body: { action: "unsubscribe", token },
    });
    setStatus(!error && data?.unsubscribed ? "success" : "error");
  }

  if (status === "success") {
    return (
      <div role="status" className="border border-champagne-400/50 p-6">
        <span className="font-mono text-mono uppercase tracking-[0.28em] text-champagne-400">
          Unsubscribed
        </span>
        <p className="font-editorial italic text-body-lg text-bone-100 mt-3">
          Marketing email has stopped. Nothing else about your account or bookings changed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-body-sm text-bone-200 leading-relaxed">
        This stops all Faineant marketing email to the address connected to this link. Account,
        booking, payment, safety, and support messages you request are separate.
      </p>
      <Button
        type="button"
        variant="accent"
        disabled={status === "submitting" || !token}
        onClick={() => void unsubscribe()}
      >
        {status === "submitting" ? "Stopping…" : "Stop marketing emails"}
      </Button>
      {status === "error" && (
        <p role="alert" className="font-mono text-mono uppercase tracking-[0.2em] text-oxblood-400">
          This link could not be processed. Email privacy@faineantapp.com for help.
        </p>
      )}
    </div>
  );
}
