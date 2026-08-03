import { marketingWelcomeEmail } from "../_shared/email-templates.ts";
import type { sendEmail as sendEmailFunction } from "../_shared/resend.ts";
import {
  clientAddress,
  createUnsubscribeToken,
  hashClientAddress,
  MARKETING_CONSENT_SOURCE,
  MARKETING_CONSENT_VERSION,
  parseSubscribeBody,
  verifyUnsubscribeToken,
} from "./logic.ts";
import type { ConsentWrite, MarketingRecord, MarketingStore } from "./store.ts";

type SendEmail = typeof sendEmailFunction;

export type MarketingConfig = {
  resendApiKey: string;
  from: string;
  supabaseUrl: string;
  siteUrl: string;
  postalAddress: string;
  signingSecret: string;
  allowedOrigins: string[];
};

export type MarketingHandlerDependencies = {
  store: MarketingStore;
  sendEmail: SendEmail;
  config: MarketingConfig;
  now?: () => Date;
};

const MAX_SUBSCRIPTIONS_PER_HOUR = 5;

function corsHeaders(origin: string | null): HeadersInit {
  return {
    ...(origin ? { "access-control-allow-origin": origin } : {}),
    "access-control-allow-headers":
      "authorization, x-client-info, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    "cache-control": "no-store",
    "content-type": "application/json",
    vary: "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(origin),
  });
}

function safeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function allowedOrigins(config: MarketingConfig): Set<string> {
  const siteOrigin = safeOrigin(config.siteUrl);
  const site = siteOrigin ? new URL(siteOrigin) : null;
  const wwwOrigin = site && !site.hostname.startsWith("www.")
    ? safeOrigin(`${site.protocol}//www.${site.hostname}`)
    : null;
  return new Set(
    [config.siteUrl, wwwOrigin ?? "", ...config.allowedOrigins]
      .map(safeOrigin)
      .filter((origin): origin is string => Boolean(origin)),
  );
}

function subscriptionEndpoint(config: MarketingConfig, token: string): string {
  return `${
    config.supabaseUrl.replace(/\/$/, "")
  }/functions/v1/marketing-subscribe/unsubscribe?token=${
    encodeURIComponent(token)
  }`;
}

function humanUnsubscribeUrl(config: MarketingConfig, token: string): string {
  return `${config.siteUrl.replace(/\/$/, "")}/unsubscribe?token=${
    encodeURIComponent(token)
  }`;
}

function emailErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message.slice(0, 500)
    : "Unknown email delivery failure";
}

function hasStrongSigningSecret(secret: string): boolean {
  return new TextEncoder().encode(secret).length >= 32;
}

async function parseJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function createMarketingHandler({
  store,
  sendEmail,
  config,
  now = () => new Date(),
}: MarketingHandlerDependencies): (request: Request) => Promise<Response> {
  const origins = allowedOrigins(config);

  return async (request: Request): Promise<Response> => {
    const requestOrigin = request.headers.get("origin");
    const origin = requestOrigin && origins.has(requestOrigin)
      ? requestOrigin
      : null;

    if (request.method === "OPTIONS") {
      return origin
        ? new Response(null, { status: 204, headers: corsHeaders(origin) })
        : json({ error: "Origin not allowed." }, 403, null);
    }

    const url = new URL(request.url);
    if (
      request.method === "POST" &&
      url.pathname.endsWith("/unsubscribe")
    ) {
      return unsubscribe(url.searchParams.get("token") ?? "", null);
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed." }, 405, origin);
    }

    const body = await parseJson(request);
    if (
      body &&
      typeof body === "object" &&
      (body as Record<string, unknown>).action === "unsubscribe"
    ) {
      return unsubscribe(
        String((body as Record<string, unknown>).token ?? ""),
        origin,
      );
    }

    if (!origin) {
      return json({ error: "Origin not allowed." }, 403, null);
    }
    if (!hasStrongSigningSecret(config.signingSecret)) {
      return json(
        { error: "Marketing service is not configured." },
        503,
        origin,
      );
    }

    const parsed = parseSubscribeBody(body);
    if (parsed.kind === "bot") {
      return json({ subscribed: true }, 202, origin);
    }
    if (parsed.kind === "invalid") {
      return json({ error: parsed.message }, 400, origin);
    }

    const address = clientAddress(request);
    if (!address) {
      return json(
        { error: "Could not verify this request. Try again." },
        400,
        origin,
      );
    }
    const ipHash = await hashClientAddress(address, config.signingSecret);
    const currentTime = now();
    const oneHourAgo = new Date(currentTime.getTime() - 60 * 60 * 1000);
    if (
      await store.countRecentConsentsByIpHash(
        ipHash,
        oneHourAgo.toISOString(),
      ) >=
        MAX_SUBSCRIPTIONS_PER_HOUR
    ) {
      return json(
        { error: "Too many requests. Try again later." },
        429,
        origin,
      );
    }

    const consentAt = currentTime.toISOString();
    const consent: ConsentWrite = {
      email: parsed.input.email,
      source: "homepage",
      referrer: parsed.input.referrer,
      user_agent: request.headers.get("user-agent")?.slice(0, 1024) ?? null,
      ip_hash: ipHash,
      marketing_status: "subscribed",
      consent_at: consentAt,
      consent_version: MARKETING_CONSENT_VERSION,
      consent_source: MARKETING_CONSENT_SOURCE,
      unsubscribed_at: null,
      last_email_error: null,
    };

    let record = await store.findByEmail(parsed.input.email);
    if (
      record?.marketing_status === "subscribed" &&
      record.welcome_email_sent_at
    ) {
      return json({ subscribed: true }, 200, origin);
    }

    if (!record) {
      record = await store.create(consent);
    } else if (record.marketing_status !== "subscribed") {
      record = await store.resubscribe(record.id, consent);
    }

    if (record.welcome_email_sent_at) {
      return json({ subscribed: true }, 200, origin);
    }

    if (
      !config.resendApiKey ||
      !config.postalAddress ||
      !config.supabaseUrl
    ) {
      const missing = !config.postalAddress
        ? "Missing MARKETING_POSTAL_ADDRESS"
        : !config.resendApiKey
        ? "Missing RESEND_API_KEY"
        : "Missing SUPABASE_URL";
      await store.markEmailError(record.id, missing);
      return json(
        {
          subscribed: true,
          emailSent: false,
          error:
            "Your address was saved, but the welcome note could not be sent. Try again.",
        },
        503,
        origin,
      );
    }

    const token = await createUnsubscribeToken(record.id, config.signingSecret);
    const rendered = marketingWelcomeEmail({
      unsubscribeUrl: humanUnsubscribeUrl(config, token),
      oneClickUnsubscribeUrl: subscriptionEndpoint(config, token),
      postalAddress: config.postalAddress,
    });

    try {
      await sendEmail(
        config.resendApiKey,
        config.from,
        record.email,
        rendered,
        `marketing-welcome/${record.id}/${record.consent_at ?? consentAt}`,
      );
      await store.markWelcomeSent(record.id, currentTime.toISOString());
      return json({ subscribed: true }, 200, origin);
    } catch (error) {
      await store.markEmailError(record.id, emailErrorMessage(error));
      return json(
        {
          subscribed: true,
          emailSent: false,
          error:
            "Your address was saved, but the welcome note could not be sent. Try again.",
        },
        503,
        origin,
      );
    }
  };

  async function unsubscribe(token: string, origin: string | null) {
    if (!hasStrongSigningSecret(config.signingSecret)) {
      return json(
        { error: "Marketing service is not configured." },
        503,
        origin,
      );
    }
    const id = await verifyUnsubscribeToken(token, config.signingSecret);
    if (!id) {
      return json(
        { error: "This unsubscribe link is not valid." },
        400,
        origin,
      );
    }
    const record: MarketingRecord | null = await store.findById(id);
    if (record && record.marketing_status !== "unsubscribed") {
      await store.unsubscribe(id, now().toISOString());
    }
    return json({ unsubscribed: true }, 200, origin);
  }
}
