import { google } from "googleapis";
import * as ical from "node-ical";
import { prisma } from "../config/database";
import { env } from "../config/env";
import { AppError } from "../middleware/error-handler";

/* ─── Google OAuth ───────────────────────────────────────────────────────── */

function getOAuth2Client() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new AppError(500, "INTERNAL_ERROR", "Google Calendar integration not configured");
  }
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
}

export function getGoogleAuthUrl(userId: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar"],
    state: userId,
  });
}

export async function handleGoogleCallback(code: string, userId: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token) {
    throw new AppError(400, "VALIDATION_ERROR", "Failed to get access token from Google");
  }

  // Get primary calendar ID
  oauth2Client.setCredentials(tokens);
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const calendarList = await calendar.calendarList.list();
  const primaryCalendar = calendarList.data.items?.find((c) => c.primary);
  const calendarId = primaryCalendar?.id || "primary";

  // Upsert connection
  const connection = await prisma.calendarConnection.upsert({
    where: { userId_provider: { userId, provider: "GOOGLE" } },
    create: {
      userId,
      provider: "GOOGLE",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      externalId: calendarId,
      isActive: true,
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || undefined,
      externalId: calendarId,
      isActive: true,
    },
  });

  // Run initial sync
  await syncGoogleCalendar(connection.id);

  return connection;
}

/* ─── Google Calendar Sync ───────────────────────────────────────────────── */

async function getAuthenticatedCalendarClient(connectionId: string) {
  const connection = await prisma.calendarConnection.findUnique({
    where: { id: connectionId },
  });
  if (!connection || !connection.accessToken) {
    throw new AppError(404, "NOT_FOUND", "Calendar connection not found");
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
  });

  // Handle token refresh
  oauth2Client.on("tokens", async (tokens) => {
    await prisma.calendarConnection.update({
      where: { id: connectionId },
      data: {
        accessToken: tokens.access_token || undefined,
        refreshToken: tokens.refresh_token || undefined,
      },
    });
  });

  return { calendar: google.calendar({ version: "v3", auth: oauth2Client }), connection };
}

export async function syncGoogleCalendar(connectionId: string) {
  const { calendar, connection } = await getAuthenticatedCalendarClient(connectionId);

  const timeMin = new Date();
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 60); // Sync next 60 days

  const params: {
    calendarId: string;
    timeMin?: string;
    timeMax?: string;
    singleEvents: boolean;
    maxResults: number;
    syncToken?: string;
  } = {
    calendarId: connection.externalId || "primary",
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true, // Expand recurring events
    maxResults: 500,
  };

  // Use sync token for incremental sync if available
  if (connection.syncToken) {
    delete params.timeMin;
    delete params.timeMax;
    params.syncToken = connection.syncToken;
  }

  try {
    const response = await calendar.events.list(params);
    const events = response.data.items || [];

    for (const event of events) {
      if (!event.id) continue;

      // Cancelled events — delete from our DB
      if (event.status === "cancelled") {
        await prisma.externalEvent.deleteMany({
          where: { calendarConnectionId: connectionId, externalId: event.id },
        });
        continue;
      }

      const startTime = event.start?.dateTime
        ? new Date(event.start.dateTime)
        : event.start?.date
          ? new Date(event.start.date)
          : null;
      const endTime = event.end?.dateTime
        ? new Date(event.end.dateTime)
        : event.end?.date
          ? new Date(event.end.date)
          : null;

      if (!startTime || !endTime) continue;

      const isAllDay = !event.start?.dateTime;
      const title = event.summary || null;

      await prisma.externalEvent.upsert({
        where: {
          calendarConnectionId_externalId: {
            calendarConnectionId: connectionId,
            externalId: event.id,
          },
        },
        create: {
          calendarConnectionId: connectionId,
          externalId: event.id,
          title,
          startTime,
          endTime,
          isAllDay,
        },
        update: {
          title,
          startTime,
          endTime,
          isAllDay,
        },
      });
    }

    // Store sync token for next incremental sync
    if (response.data.nextSyncToken) {
      await prisma.calendarConnection.update({
        where: { id: connectionId },
        data: {
          syncToken: response.data.nextSyncToken,
          lastSyncedAt: new Date(),
        },
      });
    }
  } catch (err: unknown) {
    // If sync token is invalid, reset and do full sync
    if (err instanceof Error && "code" in err && (err as { code: number }).code === 410) {
      await prisma.calendarConnection.update({
        where: { id: connectionId },
        data: { syncToken: null },
      });
      await prisma.externalEvent.deleteMany({
        where: { calendarConnectionId: connectionId },
      });
      return syncGoogleCalendar(connectionId); // Retry with full sync
    }
    throw err;
  }
}

/** Write a FAINEANT booking to the provider's Google Calendar */
export async function createGoogleCalendarEvent(
  userId: string,
  booking: {
    id: string;
    startTime: Date;
    endTime: Date;
    serviceName: string;
    clientName: string;
    notes?: string | null;
  },
) {
  const connection = await prisma.calendarConnection.findUnique({
    where: { userId_provider: { userId, provider: "GOOGLE" } },
  });
  if (!connection || !connection.isActive || !connection.accessToken) return null;

  const { calendar } = await getAuthenticatedCalendarClient(connection.id);

  const event = await calendar.events.insert({
    calendarId: connection.externalId || "primary",
    requestBody: {
      summary: `${booking.serviceName} — ${booking.clientName}`,
      description: `FAINEANT Booking #${booking.id.slice(0, 8)}${booking.notes ? `\n\nNotes: ${booking.notes}` : ""}`,
      start: { dateTime: booking.startTime.toISOString() },
      end: { dateTime: booking.endTime.toISOString() },
      source: { title: "FAINEANT", url: `${env.WEB_URL}/dashboard/provider/bookings` },
    },
  });

  return event.data.id;
}

/** Remove a FAINEANT booking from the provider's Google Calendar */
export async function deleteGoogleCalendarEvent(
  userId: string,
  googleEventId: string,
) {
  const connection = await prisma.calendarConnection.findUnique({
    where: { userId_provider: { userId, provider: "GOOGLE" } },
  });
  if (!connection || !connection.isActive || !connection.accessToken) return;

  try {
    const { calendar } = await getAuthenticatedCalendarClient(connection.id);
    await calendar.events.delete({
      calendarId: connection.externalId || "primary",
      eventId: googleEventId,
    });
  } catch {
    // Event may already be deleted — ignore
  }
}

/* ─── ICS Feed Sync ──────────────────────────────────────────────────────── */

export async function addIcsFeed(userId: string, feedUrl: string) {
  // Normalize webcal:// to https://
  const normalizedUrl = feedUrl.replace(/^webcal:\/\//, "https://");

  // Validate the feed is reachable and parseable
  let events: ical.CalendarResponse;
  try {
    events = await ical.async.fromURL(normalizedUrl);
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "Could not fetch or parse the calendar feed. Check the URL and try again.");
  }

  const eventCount = Object.values(events).filter(
    (e) => e?.type === "VEVENT",
  ).length;

  const connection = await prisma.calendarConnection.upsert({
    where: { userId_provider: { userId, provider: "ICS_FEED" } },
    create: {
      userId,
      provider: "ICS_FEED",
      feedUrl: normalizedUrl,
      isActive: true,
    },
    update: {
      feedUrl: normalizedUrl,
      isActive: true,
    },
  });

  // Run initial sync
  await syncIcsFeed(connection.id);

  return { connection, eventCount };
}

export async function syncIcsFeed(connectionId: string) {
  const connection = await prisma.calendarConnection.findUnique({
    where: { id: connectionId },
  });
  if (!connection || !connection.feedUrl || !connection.isActive) return;

  let events: ical.CalendarResponse;
  try {
    events = await ical.async.fromURL(connection.feedUrl);
  } catch {
    // Feed unreachable — skip this sync cycle
    return;
  }

  const now = new Date();
  const sixtyDaysFromNow = new Date();
  sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

  const vevents = Object.values(events).filter(
    (e): e is ical.VEvent => e?.type === "VEVENT",
  );

  // Track which external IDs we see so we can remove stale ones
  const seenIds = new Set<string>();

  for (const event of vevents) {
    const uid = event.uid;
    if (!uid) continue;

    const startTime = event.start ? new Date(event.start.toString()) : null;
    const endTime = event.end ? new Date(event.end.toString()) : null;
    if (!startTime || !endTime) continue;

    // Only sync events in the next 60 days
    if (endTime < now || startTime > sixtyDaysFromNow) continue;

    seenIds.add(uid);

    const isAllDay =
      event.start instanceof Date &&
      event.start.getHours() === 0 &&
      event.start.getMinutes() === 0 &&
      event.end instanceof Date &&
      event.end.getHours() === 0;

    // node-ical types `summary` as string | { val, params }; normalize to a string.
    const title =
      typeof event.summary === "string"
        ? event.summary
        : (event.summary?.val ?? null);

    await prisma.externalEvent.upsert({
      where: {
        calendarConnectionId_externalId: {
          calendarConnectionId: connectionId,
          externalId: uid,
        },
      },
      create: {
        calendarConnectionId: connectionId,
        externalId: uid,
        title,
        startTime,
        endTime,
        isAllDay,
      },
      update: {
        title,
        startTime,
        endTime,
        isAllDay,
      },
    });
  }

  // Remove events no longer in the feed
  await prisma.externalEvent.deleteMany({
    where: {
      calendarConnectionId: connectionId,
      externalId: { notIn: Array.from(seenIds) },
    },
  });

  await prisma.calendarConnection.update({
    where: { id: connectionId },
    data: { lastSyncedAt: new Date() },
  });
}

/* ─── Connection Management ──────────────────────────────────────────────── */

export async function getConnections(userId: string) {
  return prisma.calendarConnection.findMany({
    where: { userId },
    select: {
      id: true,
      provider: true,
      externalId: true,
      feedUrl: true,
      lastSyncedAt: true,
      isActive: true,
      createdAt: true,
      _count: { select: { externalEvents: true } },
    },
  });
}

export async function disconnectCalendar(userId: string, connectionId: string) {
  const connection = await prisma.calendarConnection.findFirst({
    where: { id: connectionId, userId },
  });
  if (!connection) {
    throw new AppError(404, "NOT_FOUND", "Calendar connection not found");
  }

  // Delete all external events
  await prisma.externalEvent.deleteMany({
    where: { calendarConnectionId: connectionId },
  });

  // Delete the connection
  await prisma.calendarConnection.delete({
    where: { id: connectionId },
  });
}

/** Get external events for a provider on a specific date (used by availability service) */
export async function getExternalEventsForDate(
  userId: string,
  date: string,
): Promise<Array<{ startTime: Date; endTime: Date }>> {
  const dayStart = new Date(date + "T00:00:00Z");
  const dayEnd = new Date(date + "T23:59:59Z");

  const events = await prisma.externalEvent.findMany({
    where: {
      calendarConnection: { userId, isActive: true },
      startTime: { lte: dayEnd },
      endTime: { gte: dayStart },
      isAllDay: false, // All-day events handled separately
    },
    select: { startTime: true, endTime: true },
  });

  // Also check for all-day events that block the entire day
  const allDayEvents = await prisma.externalEvent.findMany({
    where: {
      calendarConnection: { userId, isActive: true },
      isAllDay: true,
      startTime: { lte: dayEnd },
      endTime: { gte: dayStart },
    },
  });

  if (allDayEvents.length > 0) {
    // Return a single event blocking the whole day
    return [{ startTime: dayStart, endTime: dayEnd }];
  }

  return events;
}

/** Sync all active connections (called by cron or manual trigger) */
export async function syncAllConnections() {
  const connections = await prisma.calendarConnection.findMany({
    where: { isActive: true },
  });

  const results = await Promise.allSettled(
    connections.map((conn) => {
      if (conn.provider === "GOOGLE") return syncGoogleCalendar(conn.id);
      if (conn.provider === "ICS_FEED") return syncIcsFeed(conn.id);
      return Promise.resolve();
    }),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return { total: connections.length, succeeded, failed };
}
