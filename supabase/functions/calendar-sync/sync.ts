import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decrypt, encrypt } from "../_shared/crypto.ts";
import {
  type GoogleEventList,
  listEvents,
  refreshAccessToken,
} from "../_shared/google-calendar.ts";
import { fetchIcsText, normalizeIcsUrl, parseIcs } from "../_shared/ics.ts";
import {
  type EventRow,
  googleEventToRow,
  icsEventToRow,
  withinWindow,
} from "./event-map.ts";

export interface CalendarConnection {
  id: string;
  user_id: string;
  provider: "GOOGLE" | "ICS_FEED";
  access_token: string | null;
  refresh_token: string | null;
  external_id: string | null;
  feed_url: string | null;
  sync_token: string | null;
  is_active: boolean;
}

function assertDatabase(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

function chunks<T>(values: T[], size = 200): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

async function reconcileEvents(
  db: SupabaseClient,
  connectionId: string,
  rows: EventRow[],
  options: { removeMissing: boolean; cancelledIds?: string[] },
): Promise<void> {
  const uniqueRows = [
    ...new Map(rows.map((row) => [row.externalId, row])).values(),
  ];
  const cancelledIds = [...new Set(options.cancelledIds ?? [])];

  for (const batch of chunks(cancelledIds)) {
    const { error } = await db
      .from("external_events")
      .delete()
      .eq("calendar_connection_id", connectionId)
      .in("external_id", batch);
    assertDatabase(error);
  }

  for (const batch of chunks(uniqueRows)) {
    const { error } = await db.from("external_events").upsert(
      batch.map((row) => ({
        calendar_connection_id: connectionId,
        external_id: row.externalId,
        title: row.title,
        start_time: row.startTime,
        end_time: row.endTime,
        is_all_day: row.isAllDay,
      })),
      { onConflict: "calendar_connection_id,external_id" },
    );
    assertDatabase(error);
  }

  if (!options.removeMissing) return;
  const { data: existing, error: existingError } = await db
    .from("external_events")
    .select("external_id")
    .eq("calendar_connection_id", connectionId);
  assertDatabase(existingError);
  const seen = new Set(uniqueRows.map((row) => row.externalId));
  const stale = (existing ?? [])
    .map((event) => event.external_id as string)
    .filter((externalId) => !seen.has(externalId));
  for (const batch of chunks(stale)) {
    const { error } = await db
      .from("external_events")
      .delete()
      .eq("calendar_connection_id", connectionId)
      .in("external_id", batch);
    assertDatabase(error);
  }
}

function fullSyncWindow(now: Date): { timeMin: string; timeMax: string } {
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + 60);
  return { timeMin: now.toISOString(), timeMax: end.toISOString() };
}

async function googleList(
  connection: CalendarConnection,
  accessToken: string,
  now: Date,
): Promise<GoogleEventList> {
  return await listEvents(
    accessToken,
    connection.external_id ?? "primary",
    connection.sync_token
      ? { syncToken: connection.sync_token }
      : fullSyncWindow(now),
  );
}

async function syncGoogle(
  db: SupabaseClient,
  connection: CalendarConnection,
  now: Date,
): Promise<number> {
  if (!connection.access_token) {
    throw new Error("Google Calendar must be reconnected");
  }
  let accessToken = await decrypt(connection.access_token);
  let result = await googleList(connection, accessToken, now);

  if (result.status === 401) {
    if (!connection.refresh_token) {
      throw new Error("Google Calendar authorization expired; reconnect it");
    }
    const refreshed = await refreshAccessToken(
      await decrypt(connection.refresh_token),
    );
    accessToken = refreshed.accessToken;
    const update: Record<string, unknown> = {
      access_token: await encrypt(refreshed.accessToken),
    };
    if (refreshed.refreshToken) {
      update.refresh_token = await encrypt(refreshed.refreshToken);
    }
    const { error } = await db
      .from("calendar_connections")
      .update(update)
      .eq("id", connection.id)
      .eq("user_id", connection.user_id);
    assertDatabase(error);
    result = await googleList(connection, accessToken, now);
  }

  let removeMissing = !connection.sync_token;
  if (result.status === 410 && connection.sync_token) {
    connection.sync_token = null;
    const { error } = await db
      .from("calendar_connections")
      .update({ sync_token: null })
      .eq("id", connection.id)
      .eq("user_id", connection.user_id);
    assertDatabase(error);
    result = await googleList(connection, accessToken, now);
    removeMissing = true;
  }
  if (result.status !== 200) {
    throw new Error(`Google Calendar sync failed with HTTP ${result.status}`);
  }

  const cancelledIds = result.items.flatMap((event) =>
    event.status === "cancelled" && event.id ? [event.id] : []
  );
  const rows = result.items.flatMap((event) => {
    const row = googleEventToRow(event);
    return row ? [row] : [];
  });
  await reconcileEvents(db, connection.id, rows, {
    removeMissing,
    cancelledIds,
  });

  const { error } = await db
    .from("calendar_connections")
    .update({
      sync_token: result.nextSyncToken ?? connection.sync_token,
      last_synced_at: now.toISOString(),
      is_active: true,
    })
    .eq("id", connection.id)
    .eq("user_id", connection.user_id);
  assertDatabase(error);
  return rows.length;
}

async function syncIcs(
  db: SupabaseClient,
  connection: CalendarConnection,
  now: Date,
): Promise<number> {
  if (!connection.feed_url) throw new Error("ICS connection has no feed URL");
  const normalizedUrl = normalizeIcsUrl(connection.feed_url).toString();
  const rows = parseIcs(await fetchIcsText(normalizedUrl))
    .flatMap((event) => {
      const row = icsEventToRow(event);
      return row ? [row] : [];
    })
    .filter((row) => withinWindow(row, now));
  await reconcileEvents(db, connection.id, rows, { removeMissing: true });
  const { error } = await db
    .from("calendar_connections")
    .update({
      feed_url: normalizedUrl,
      last_synced_at: now.toISOString(),
      is_active: true,
    })
    .eq("id", connection.id)
    .eq("user_id", connection.user_id);
  assertDatabase(error);
  return rows.length;
}

export async function syncConnection(
  db: SupabaseClient,
  connection: CalendarConnection,
  now = new Date(),
): Promise<number> {
  if (!connection.is_active) return 0;
  return connection.provider === "GOOGLE"
    ? await syncGoogle(db, connection, now)
    : await syncIcs(db, connection, now);
}
