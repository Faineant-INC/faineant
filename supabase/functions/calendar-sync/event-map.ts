import type { GoogleEvent } from "../_shared/google-calendar.ts";
import type { IcsEvent } from "../_shared/ics.ts";

export interface EventRow {
  externalId: string;
  title: string | null;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
}

function normalizedDate(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function googleEventToRow(event: GoogleEvent): EventRow | null {
  if (!event.id || event.status === "cancelled") return null;
  const startTime = normalizedDate(event.start?.dateTime ?? event.start?.date);
  const endTime = normalizedDate(event.end?.dateTime ?? event.end?.date);
  if (!startTime || !endTime || endTime <= startTime) return null;
  return {
    externalId: event.id,
    title: event.summary ?? null,
    startTime,
    endTime,
    isAllDay: !event.start?.dateTime,
  };
}

export function icsEventToRow(event: IcsEvent): EventRow | null {
  if (!event.uid) return null;
  const startTime = normalizedDate(event.start);
  const endTime = normalizedDate(event.end);
  if (!startTime || !endTime || endTime <= startTime) return null;
  return {
    externalId: event.uid,
    title: event.summary ?? null,
    startTime,
    endTime,
    isAllDay: Boolean(event.allDay),
  };
}

export function withinWindow(
  row: EventRow,
  now: Date,
  days = 60,
): boolean {
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + days);
  return new Date(row.endTime) >= now && new Date(row.startTime) <= end;
}
