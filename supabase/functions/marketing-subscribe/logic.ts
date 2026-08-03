export const MARKETING_CONSENT_VERSION = "marketing-email-v1";
export const MARKETING_CONSENT_SOURCE = "homepage-waitlist";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SubscribeInput = {
  email: string;
  referrer: string | null;
};

export type SubscribeParseResult =
  | { kind: "valid"; input: SubscribeInput }
  | { kind: "bot" }
  | { kind: "invalid"; message: string };

export function parseSubscribeBody(body: unknown): SubscribeParseResult {
  if (!body || typeof body !== "object") {
    return { kind: "invalid", message: "Enter a valid email address." };
  }

  const value = body as Record<string, unknown>;
  if (typeof value.website === "string" && value.website.length > 0) {
    return { kind: "bot" };
  }

  const email = typeof value.email === "string"
    ? value.email.trim().toLowerCase()
    : "";
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { kind: "invalid", message: "Enter a valid email address." };
  }
  if (
    value.marketingConsent !== true ||
    value.consentVersion !== MARKETING_CONSENT_VERSION
  ) {
    return {
      kind: "invalid",
      message: "Choose the email marketing consent box to join the list.",
    };
  }

  const referrer = typeof value.referrer === "string"
    ? value.referrer.slice(0, 512)
    : null;
  return { kind: "valid", input: { email, referrer } };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function hmac(message: string, secret: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(message)),
  );
}

export async function hashClientAddress(
  address: string,
  secret: string,
): Promise<string> {
  return bytesToBase64Url(await hmac(`ip:${address}`, secret));
}

export async function createUnsubscribeToken(
  id: string,
  secret: string,
): Promise<string> {
  const signature = bytesToBase64Url(await hmac(`unsubscribe:${id}`, secret));
  return `${id}.${signature}`;
}

function constantTimeEqual(left: string, right: string): boolean {
  const maxLength = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < maxLength; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^
      (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export async function verifyUnsubscribeToken(
  token: string,
  secret: string,
): Promise<string | null> {
  const separator = token.indexOf(".");
  if (separator < 1) return null;
  const id = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !signature) return null;
  const expected = await createUnsubscribeToken(id, secret);
  const expectedSignature = expected.slice(expected.indexOf(".") + 1);
  return constantTimeEqual(signature, expectedSignature) ? id : null;
}

export function clientAddress(request: Request): string | null {
  const direct = request.headers.get("cf-connecting-ip")?.trim();
  if (direct) return direct;
  const forwarded = request.headers.get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return forwarded || null;
}
