const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
}

export interface GoogleEvent {
  id?: string;
  status?: string;
  summary?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

export interface GoogleEventList {
  status: number;
  items: GoogleEvent[];
  nextSyncToken: string | null;
}

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

async function tokenRequest(
  parameters: URLSearchParams,
): Promise<GoogleTokens> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: parameters,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || typeof body.access_token !== "string") {
    throw new Error(
      typeof body.error_description === "string"
        ? body.error_description
        : "Google token exchange failed",
    );
  }
  return {
    accessToken: body.access_token,
    refreshToken: typeof body.refresh_token === "string"
      ? body.refresh_token
      : null,
    expiresIn: typeof body.expires_in === "number" ? body.expires_in : null,
  };
}

export async function exchangeCode(code: string): Promise<GoogleTokens> {
  return await tokenRequest(
    new URLSearchParams({
      code,
      client_id: required("GOOGLE_CLIENT_ID"),
      client_secret: required("GOOGLE_CLIENT_SECRET"),
      redirect_uri: required("GOOGLE_REDIRECT_URI"),
      grant_type: "authorization_code",
    }),
  );
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<GoogleTokens> {
  return await tokenRequest(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: required("GOOGLE_CLIENT_ID"),
      client_secret: required("GOOGLE_CLIENT_SECRET"),
      grant_type: "refresh_token",
    }),
  );
}

export async function getPrimaryCalendarId(
  accessToken: string,
): Promise<string> {
  const response = await fetch(`${CALENDAR_API}/users/me/calendarList`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Could not read the Google calendar list");
  const primary = Array.isArray(body.items)
    ? body.items.find(
      (item: Record<string, unknown>) =>
        item.primary === true && typeof item.id === "string",
    )
    : null;
  return typeof primary?.id === "string" ? primary.id : "primary";
}

export async function listEvents(
  accessToken: string,
  calendarId: string,
  options: { syncToken?: string | null; timeMin?: string; timeMax?: string },
): Promise<GoogleEventList> {
  const items: GoogleEvent[] = [];
  let pageToken: string | null = null;
  let nextSyncToken: string | null = null;

  do {
    const query = new URLSearchParams({
      singleEvents: "true",
      showDeleted: "true",
      maxResults: "500",
    });
    if (options.syncToken) query.set("syncToken", options.syncToken);
    else {
      if (options.timeMin) query.set("timeMin", options.timeMin);
      if (options.timeMax) query.set("timeMax", options.timeMax);
    }
    if (pageToken) query.set("pageToken", pageToken);

    const response = await fetch(
      `${CALENDAR_API}/calendars/${
        encodeURIComponent(calendarId)
      }/events?${query}`,
      { headers: { authorization: `Bearer ${accessToken}` } },
    );
    if (response.status === 401 || response.status === 410) {
      return { status: response.status, items: [], nextSyncToken: null };
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        typeof body?.error?.message === "string"
          ? body.error.message
          : "Google Calendar event import failed",
      );
    }
    if (Array.isArray(body.items)) items.push(...body.items);
    pageToken = typeof body.nextPageToken === "string"
      ? body.nextPageToken
      : null;
    nextSyncToken = typeof body.nextSyncToken === "string"
      ? body.nextSyncToken
      : nextSyncToken;
  } while (pageToken);

  return { status: 200, items, nextSyncToken };
}
