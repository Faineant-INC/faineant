import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { resolveJob } from "./logic.ts";

function mockDb(opts: { firstName?: string; email?: string; provFirst?: string; provLast?: string }) {
  return {
    from(table: string) {
      return {
        select() { return this; },
        eq() { return this; },
        async single() {
          if (table === "profiles") return { data: { first_name: opts.firstName ?? "Sasha" } };
          if (table === "provider_profiles") return { data: { profiles: { first_name: opts.provFirst ?? "Maeve", last_name: opts.provLast ?? "Le Gal" } } };
          return { data: null };
        },
      };
    },
    auth: { admin: { async getUserById() { return { data: { user: { email: opts.email ?? "client@example.com" } } }; } } },
  } as unknown as Parameters<typeof resolveJob>[1];
}

Deno.test("new booking -> confirmation job to client", async () => {
  const job = await resolveJob(
    { type: "INSERT", table: "bookings", old_record: null,
      record: { id: "bk_1", client_id: "c1", provider_profile_id: "pp1", location: "Wicker Park", start_time: "2026-06-04T19:00:00Z" } },
    mockDb({}));
  assert(job);
  assertEquals(job!.to, "client@example.com");
  assertEquals(job!.idempotencyKey, "booking-confirmation/bk_1");
  assert(job!.rendered.subject.includes("booked"));
});

Deno.test("status->CANCELLED -> cancellation job", async () => {
  const job = await resolveJob(
    { type: "UPDATE", table: "bookings",
      old_record: { status: "CONFIRMED" },
      record: { id: "bk_1", client_id: "c1", provider_profile_id: "pp1", status: "CANCELLED" } },
    mockDb({}));
  assert(job);
  assertEquals(job!.idempotencyKey, "booking-cancellation/bk_1");
  assert(job!.rendered.subject.toLowerCase().includes("leave"));
});

Deno.test("new profile -> welcome job", async () => {
  const job = await resolveJob(
    { type: "INSERT", table: "profiles", old_record: null,
      record: { id: "u1", first_name: "Sasha" } },
    mockDb({ email: "sasha@example.com" }));
  assert(job);
  assertEquals(job!.to, "sasha@example.com");
  assertEquals(job!.idempotencyKey, "welcome/u1");
});

Deno.test("unrelated event -> no job", async () => {
  const job = await resolveJob(
    { type: "UPDATE", table: "bookings", old_record: { status: "PENDING" }, record: { status: "CONFIRMED" } },
    mockDb({}));
  assertEquals(job, null);
});
