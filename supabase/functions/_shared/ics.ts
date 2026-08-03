import ICAL from "npm:ical.js@2.2.1";

const MAX_ICS_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;

export interface IcsEvent {
  uid?: string;
  summary?: string;
  start?: string;
  end?: string;
  allDay?: boolean;
}

function blockedIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false;
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

export function normalizeIcsUrl(value: string): URL {
  const normalized = value.trim().replace(/^webcal:\/\//i, "https://");
  if (normalized.length > 2048) throw new Error("Calendar URL is too long");
  const url = new URL(normalized);
  if (url.protocol !== "https:") {
    throw new Error("Calendar feeds must use HTTPS or webcal");
  }
  if (url.username || url.password) {
    throw new Error("Calendar URL credentials are not allowed");
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "::" ||
    hostname === "::1" ||
    hostname.startsWith("fc") ||
    hostname.startsWith("fd") ||
    hostname.startsWith("fe80:") ||
    blockedIpv4(hostname)
  ) {
    throw new Error("Private calendar feed addresses are not allowed");
  }
  return url;
}

export async function readResponseText(
  response: Response,
  maxBytes = MAX_ICS_BYTES,
): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel("Calendar feed is too large");
      throw new Error("Calendar feed is too large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function fetchIcsText(value: string): Promise<string> {
  let url = normalizeIcsUrl(value);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await fetch(url, {
      headers: { accept: "text/calendar, text/plain;q=0.8" },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirects === MAX_REDIRECTS) {
        throw new Error("Calendar feed redirected too many times");
      }
      url = normalizeIcsUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) {
      throw new Error(`Calendar feed returned HTTP ${response.status}`);
    }
    const declaredSize = Number(response.headers.get("content-length") ?? "0");
    if (declaredSize > MAX_ICS_BYTES) {
      throw new Error("Calendar feed is too large");
    }
    return await readResponseText(response);
  }
  throw new Error("Calendar feed could not be loaded");
}

export function parseIcs(text: string): IcsEvent[] {
  const calendar = new ICAL.Component(ICAL.parse(text));
  return calendar.getAllSubcomponents("vevent").map((component) => {
    const event = new ICAL.Event(component);
    return {
      uid: event.uid || undefined,
      summary: event.summary || undefined,
      start: event.startDate?.toJSDate().toISOString(),
      end: event.endDate?.toJSDate().toISOString(),
      allDay: Boolean(event.startDate?.isDate),
    };
  });
}
