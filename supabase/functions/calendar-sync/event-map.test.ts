import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { googleEventToRow, icsEventToRow, withinWindow } from "./event-map.ts";

Deno.test("Google event mapping skips cancelled and malformed events", () => {
  assertEquals(
    googleEventToRow({ id: "cancelled", status: "cancelled" }),
    null,
  );
  assertEquals(googleEventToRow({ id: "missing-times" }), null);
  assertEquals(
    googleEventToRow({
      id: "backwards",
      start: { dateTime: "2026-08-02T11:00:00Z" },
      end: { dateTime: "2026-08-02T10:00:00Z" },
    }),
    null,
  );
});

Deno.test("Google event mapping distinguishes all-day events", () => {
  const allDay = googleEventToRow({
    id: "all-day",
    summary: "Away",
    start: { date: "2026-08-02" },
    end: { date: "2026-08-03" },
  });
  const timed = googleEventToRow({
    id: "timed",
    start: { dateTime: "2026-08-02T10:00:00Z" },
    end: { dateTime: "2026-08-02T11:00:00Z" },
  });
  assert(allDay?.isAllDay);
  assertEquals(timed?.isAllDay, false);
});

Deno.test("ICS event mapping requires a UID and valid interval", () => {
  assertEquals(
    icsEventToRow({
      start: "2026-08-02T10:00:00Z",
      end: "2026-08-02T11:00:00Z",
    }),
    null,
  );
  assertEquals(
    icsEventToRow({
      uid: "event-1",
      summary: "Busy",
      start: "2026-08-02T10:00:00Z",
      end: "2026-08-02T11:00:00Z",
    })?.externalId,
    "event-1",
  );
});

Deno.test("window filtering keeps overlapping events only", () => {
  const now = new Date("2026-08-02T00:00:00Z");
  const row = {
    externalId: "event-1",
    title: null,
    startTime: "2026-08-10T10:00:00Z",
    endTime: "2026-08-10T11:00:00Z",
    isAllDay: false,
  };
  assert(withinWindow(row, now));
  assertEquals(
    withinWindow({
      ...row,
      startTime: "2027-01-01T00:00:00Z",
      endTime: "2027-01-02T00:00:00Z",
    }, now),
    false,
  );
  assertEquals(
    withinWindow({
      ...row,
      startTime: "2026-07-01T00:00:00Z",
      endTime: "2026-07-02T00:00:00Z",
    }, now),
    false,
  );
});
