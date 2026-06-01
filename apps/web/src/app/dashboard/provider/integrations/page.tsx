"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import {
  Calendar,
  Instagram,
  Link2,
  Unlink,
  ExternalLink,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
} from "lucide-react";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: "connected" | "disconnected";
  connectedAt?: string;
  details?: string;
}

export default function IntegrationsPage() {
  const { accessToken } = useAuth();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const integrations: Integration[] = [
    {
      id: "google-calendar",
      name: "Google Calendar",
      description:
        "Two-way sync. External events block your Faineant availability; Faineant visits land in Google Calendar.",
      icon: Calendar,
      status: "disconnected",
    },
    {
      id: "instagram",
      name: "Instagram",
      description:
        "Pull recent posts into your portfolio. We're still negotiating with Meta — patience.",
      icon: Instagram,
      status: "disconnected",
    },
  ];

  async function handleConnect(integrationId: string) {
    setConnecting(integrationId);
    setError(null);
    setSuccess(null);
    try {
      if (integrationId === "google-calendar") {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
        window.location.href = `${apiUrl}/calendar/auth/google?token=${accessToken}`;
        return;
      }
      if (integrationId === "instagram") {
        setError(
          "Instagram is not ready yet. We'll let you know when it is.",
        );
      }
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setConnecting(null);
    }
  }

  return (
    <div className="px-5 md:px-10 lg:px-14 py-8 md:py-12 flex flex-col gap-8 md:gap-12">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 pb-5 border-b border-smoke-700">
        <h2 className="font-display display-compressed text-[2.625rem] leading-none text-bone-100">
          Calendar{" "}
          <em className="font-editorial italic font-light text-champagne-400">
            sync.
          </em>
        </h2>
        <p className="font-editorial italic text-body-lg text-bone-200 md:max-w-[340px] md:text-right leading-snug">
          Google Calendar &mdash; two-way. Apple Calendar &mdash; read-only via ICS.
        </p>
      </header>

      {error && (
        <div className="border border-smoke-700 bg-smoke-800 px-4 py-3 text-label uppercase tracking-[0.18em] text-bone-200">
          {error}
        </div>
      )}
      {success && (
        <div className="border border-smoke-700 bg-smoke-800 px-4 py-3 text-label uppercase tracking-[0.18em] text-champagne-400">
          {success}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {integrations.map((integration) => (
          <Card
            key={integration.id}
            className="border-smoke-700 bg-smoke-900"
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center border border-smoke-700 bg-smoke-800">
                    <integration.icon className="h-5 w-5 text-champagne-400" />
                  </div>
                  <div>
                    <CardTitle className="font-display text-bone-100 tracking-[-0.01em]">
                      {integration.name}
                    </CardTitle>
                    <CardDescription className="mt-1 font-editorial italic text-bone-200">
                      {integration.description}
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  className={`shrink-0 gap-1.5 border-smoke-700 bg-smoke-800 text-label uppercase tracking-[0.18em] ${
                    integration.status === "connected"
                      ? "text-champagne-400"
                      : "text-taupe-300"
                  }`}
                >
                  {integration.status === "connected" ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      Connected
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3" />
                      Idle
                    </>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {integration.status === "connected" ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-smoke-700 bg-smoke-800 px-4 py-3">
                  <div>
                    <p className="font-mono text-mono text-bone-100">
                      {integration.details || "Connected"}
                    </p>
                    {integration.connectedAt && (
                      <p className="text-label uppercase tracking-[0.18em] text-taupe-300 mt-1">
                        Since{" "}
                        {new Date(integration.connectedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    <Unlink className="h-3.5 w-3.5" />
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => handleConnect(integration.id)}
                  disabled={connecting === integration.id}
                  className="gap-2"
                >
                  <Link2 className="h-4 w-4" />
                  {connecting === integration.id
                    ? "Connecting…"
                    : `Connect ${integration.name}`}
                </Button>
              )}

              <div className="mt-5 space-y-2">
                {integration.id === "google-calendar" && (
                  <>
                    <FeatureRow icon={CheckCircle2} text="External events block your availability" />
                    <FeatureRow icon={CheckCircle2} text="Faineant visits land in Google Calendar" />
                    <FeatureRow icon={CheckCircle2} text="Real-time push sync" />
                  </>
                )}
                {integration.id === "instagram" && (
                  <>
                    <FeatureRow icon={ImageIcon} text="Pull recent posts to portfolio" />
                    <FeatureRow icon={ExternalLink} text="Link to your Instagram profile" />
                    <FeatureRow icon={Clock} text="Refreshes every 15 minutes" />
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="border-t border-smoke-700 pt-8">
        <h4 className="text-label uppercase tracking-[0.32em] text-taupe-300 mb-5 font-medium">
          Coming, eventually
        </h4>
        <p className="font-editorial italic text-body-lg text-bone-200 mb-5">
          A few more partners. No promises on timing.
        </p>
        <div className="flex flex-wrap gap-2">
          {["Apple Calendar", "Booksy", "Square", "Vagaro", "TikTok"].map(
            (name) => (
              <div
                key={name}
                className="border border-smoke-700 bg-smoke-900 px-4 py-2 font-mono text-mono text-taupe-300"
              >
                {name}
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  );
}

function FeatureRow({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 font-editorial italic text-body-sm text-bone-200">
      <Icon className="h-3.5 w-3.5 text-champagne-400" />
      {text}
    </div>
  );
}
