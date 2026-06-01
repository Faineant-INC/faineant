# Supabase Edge Function: send-email (Plan 4a)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver transactional email (booking confirmation, cancellation, welcome) from a Supabase **Edge Function** triggered by **Database Webhooks**, replacing the Express + Resend path. Email sending moves fully server-side in Supabase.

**Architecture:** A Deno Edge Function `send-email` receives Database-Webhook POSTs on `bookings` (INSERT → confirmation; UPDATE→CANCELLED → cancellation) and `profiles` (INSERT → welcome). It verifies a shared webhook secret, uses the **service-role** key to look up the recipient + related names the webhook payload lacks, renders the brand templates (ported to Deno), and sends via the **Resend HTTP API** with an idempotency key. Pure logic (event→email mapping + template rendering) is isolated so it unit-tests without network. The webhook triggers are created in a migration but their target URL/secret are environment-configurable (Postgres settings) and finalized per environment.

**Builds on:** Plans 1–3 (merged to `main`). Branch `claude/supabase-edge-send-email` off `main`. Repo root `/Users/guillermovillegas/development/Arc`. Local DB: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.

**This plan = Resend send-email only.** Stripe and Google Calendar Edge Functions are separate later sub-plans (4b, 4c).

**Scope/design calls (flagged):**
- Welcome email fires on `profiles` INSERT (i.e., at signup). The old flow sent it post-verification; signup-time is simpler and acceptable. Flag if you want it gated on email confirmation instead.
- Booking emails go to the **client**. (Provider notifications are out of scope here.)
- The function uses `verify_jwt = false` (it's called by the DB webhook with a shared secret, not an end-user JWT) and authenticates via a `SEND_EMAIL_WEBHOOK_SECRET` header.

---

## Tooling note (Task 0 handles this)
Deno is **not installed**. Unit tests use `deno test`. Task 0 installs Deno (`brew install deno`); if that's unavailable, fall back to running the function via `supabase functions serve` + HTTP smoke checks and report the substitution.

## File Structure
- Create: `supabase/functions/_shared/email-templates.ts` — Deno port of booking-confirmation / cancellation / welcome renderers (subject/html/text)
- Create: `supabase/functions/_shared/resend.ts` — minimal Resend HTTP client (`sendEmail` with idempotency key)
- Create: `supabase/functions/send-email/index.ts` — webhook handler (secret verify → route → fetch → render → send)
- Create: `supabase/functions/send-email/logic.ts` — pure `buildEmail(event)` mapping (no I/O), and types
- Create: `supabase/functions/send-email/logic.test.ts` — Deno unit tests (pure logic + rendering)
- Create: `supabase/functions/send-email/index.test.ts` — Deno tests of the handler with mocked fetch + mocked data lookup
- Modify: `supabase/config.toml` — `[functions.send-email] verify_jwt = false`
- Create: `supabase/migrations/<ts>_email_webhooks.sql` — triggers on bookings/profiles → `supabase_functions.http_request`, URL+secret from settings
- Create: `supabase/functions/send-email/README.md` — env/secrets + webhook registration notes

---

## Task 0: Install Deno + scaffold the function

- [ ] **Step 1: Ensure Deno is available**

Run `deno --version`. If "command not found", install:
```bash
brew install deno
```
Then `deno --version` again. If brew/install is unavailable, STOP and report DONE_WITH_CONCERNS noting Deno couldn't be installed (the plan's `deno test` steps will need the `supabase functions serve` fallback).

- [ ] **Step 2: Scaffold the function**
```bash
supabase functions new send-email
```
Expected: creates `supabase/functions/send-email/index.ts` (a stub). You'll replace it in Task 3.

- [ ] **Step 3: Disable JWT verification for this webhook function**

In `supabase/config.toml` add (or set):
```toml
[functions.send-email]
verify_jwt = false
```

- [ ] **Step 4: Commit**
```bash
git add supabase/functions/send-email supabase/config.toml
git commit -m "chore(functions): scaffold send-email edge function (verify_jwt=false)"
```

---

## Task 1: Port email templates to Deno + unit-test rendering

**Files:** Create `supabase/functions/_shared/email-templates.ts`, `supabase/functions/send-email/logic.test.ts` (rendering portion).

- [ ] **Step 1: Write the Deno templates module**

Port the brand templates (mirror `apps/api/src/services/email-templates.ts`) into `supabase/functions/_shared/email-templates.ts`. Export `RenderedEmail` (`{subject, html, text}`) and three pure functions. Use this exact content:
```ts
const WORDMARK_URL = "https://faineantapp.com/brand/faineant-wordmark-black.png";

export interface RenderedEmail { subject: string; html: string; text: string; }

const escapeHtml = (v: string): string =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;").replace(/'/g, "&#039;");

function shell(eyebrow: string, headline: string, body: string): string {
  return `<div style="background:#f3ede1;padding:48px;max-width:680px;margin:0 auto;">
  <div style="text-align:center;padding-bottom:32px;border-bottom:1px solid #d8d2c4;">
    <img src="${WORDMARK_URL}" height="32" alt="FAINEANT" /></div>
  <div style="padding:48px 0;">
    <span style="font-family:Inter,sans-serif;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#7a6f5e;">${eyebrow}</span>
    <h1 style="font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:42px;letter-spacing:-0.04em;line-height:0.98;color:#0e0d0c;margin:24px 0;">${headline}</h1>
    ${body}</div>
  <div style="background:#ede4d4;padding:24px 48px;font-family:Geist Mono,monospace;font-size:10px;color:#5a5240;text-align:center;letter-spacing:0.04em;">© FAINEANT · CHICAGO · 2026<br>NOTHING URGENT</div>
</div>`;
}
const para = (t: string) =>
  `<p style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:18px;line-height:1.5;color:#3d352c;">${t}</p>`;

export function bookingConfirmationEmail(v: {
  reservationId: string; firstName: string; practitionerName: string;
  neighbourhood: string; whenHumanised: string;
}): RenderedEmail {
  const e = {
    reservationId: escapeHtml(v.reservationId), firstName: escapeHtml(v.firstName),
    practitionerName: escapeHtml(v.practitionerName), neighbourhood: escapeHtml(v.neighbourhood),
    whenHumanised: escapeHtml(v.whenHumanised),
  };
  return {
    subject: "It's booked. Don't get up early.",
    html: shell(`Reservation confirmed · ${e.reservationId}`,
      `It's <em style="font-family:'Cormorant Garamond',serif;font-weight:300;font-style:italic;color:#7a6f5e;">booked.</em><br>Don't get up early.`,
      `${para(`${e.firstName} — ${e.practitionerName} will be at your ${e.neighbourhood} door ${e.whenHumanised}. She brings everything but the chair.`)}${para("Cancellation is free until midnight tonight, then you owe nothing if you let her know two hours before.")}`),
    text: `${v.firstName} — your reservation (${v.reservationId}) is confirmed. ${v.practitionerName} will be at your ${v.neighbourhood} door ${v.whenHumanised}.\n\n— Faineant · Chicago · Nothing urgent.`,
  };
}

export function cancellationEmail(v: {
  firstName: string; reservationId: string; practitionerName: string;
}): RenderedEmail {
  const e = { firstName: escapeHtml(v.firstName), reservationId: escapeHtml(v.reservationId), practitionerName: escapeHtml(v.practitionerName) };
  return {
    subject: "No need to leave today either.",
    html: shell(`Reservation cancelled · ${e.reservationId}`,
      `No need to leave<br><em style="font-family:'Cormorant Garamond',serif;font-weight:300;font-style:italic;color:#7a6f5e;">today either.</em>`,
      `${para(`${e.firstName} — your reservation with ${e.practitionerName} (${e.reservationId}) has been cancelled. Nothing further is owed.`)}${para("When you are ready again, she will be too. The door stays the same.")}`),
    text: `${v.firstName} — your reservation with ${v.practitionerName} (${v.reservationId}) has been cancelled. Nothing further is owed.\n\n— Faineant · Chicago · Nothing urgent.`,
  };
}

export function welcomeEmail(v: { firstName: string }): RenderedEmail {
  const e = { firstName: escapeHtml(v.firstName) };
  return {
    subject: "An hour of nothing awaits.",
    html: shell("Welcome to FAINEANT",
      `An hour of <em style="font-family:'Cormorant Garamond',serif;font-weight:300;font-style:italic;color:#7a6f5e;">nothing</em><br>awaits.`,
      `${para(`${e.firstName} — welcome. Faineant is the part of your day where the practitioner comes to you and the rest of the world can wait.`)}${para("Browse when you feel like it. Book when you mean it. We will not rush you.")}`),
    text: `${v.firstName} — welcome to Faineant. The practitioner comes to you; the rest of the world can wait.\n\n— Faineant · Chicago · Nothing urgent.`,
  };
}
```

- [ ] **Step 2: Write a rendering unit test**

Create `supabase/functions/send-email/logic.test.ts`:
```ts
import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { bookingConfirmationEmail, cancellationEmail, welcomeEmail } from "../_shared/email-templates.ts";

Deno.test("booking confirmation renders brand voice + escapes input", () => {
  const r = bookingConfirmationEmail({
    reservationId: "bk_1", firstName: "Sasha", practitionerName: "Maeve",
    neighbourhood: "Wicker Park", whenHumanised: "on Thursday at 2:00 PM",
  });
  assertStringIncludes(r.subject, "booked");
  assertStringIncludes(r.html, "Wicker Park");
  assertStringIncludes(r.text, "Sasha");
});

Deno.test("cancellation includes practitioner + reservation", () => {
  const r = cancellationEmail({ firstName: "Sasha", reservationId: "bk_1", practitionerName: "Maeve" });
  assertStringIncludes(r.subject.toLowerCase(), "leave");
  assertStringIncludes(r.html, "Maeve");
});

Deno.test("welcome greets by name", () => {
  const r = welcomeEmail({ firstName: "Sasha" });
  assertStringIncludes(r.subject.toLowerCase(), "nothing");
  assertStringIncludes(r.text, "Sasha");
});

Deno.test("html-escapes angle brackets in input", () => {
  const r = welcomeEmail({ firstName: "<script>" });
  assertStringIncludes(r.html, "&lt;script&gt;");
});
```

- [ ] **Step 3: Run the tests**

Run: `deno test supabase/functions/send-email/logic.test.ts` — expect 4 passed. (If Deno unavailable, report and skip per Task 0 fallback.)

- [ ] **Step 4: Commit**
```bash
git add supabase/functions/_shared/email-templates.ts supabase/functions/send-email/logic.test.ts
git commit -m "feat(functions): port brand email templates to Deno + render tests"
```

---

## Task 2: Resend client + pure event→email logic

**Files:** Create `supabase/functions/_shared/resend.ts`, `supabase/functions/send-email/logic.ts`.

- [ ] **Step 1: Resend HTTP client**

Create `supabase/functions/_shared/resend.ts`:
```ts
import type { RenderedEmail } from "./email-templates.ts";

export async function sendEmail(
  apiKey: string, from: string, to: string, rendered: RenderedEmail, idempotencyKey: string,
): Promise<{ id?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ from, to, subject: rendered.subject, html: rendered.html, text: rendered.text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
  return await res.json();
}
```

- [ ] **Step 2: Pure routing logic + types**

Create `supabase/functions/send-email/logic.ts`:
```ts
import { bookingConfirmationEmail, cancellationEmail, welcomeEmail, type RenderedEmail } from "../_shared/email-templates.ts";

export interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

// Recipient + rendered email + idempotency key, or null if this event sends nothing.
export interface EmailJob { to: string; rendered: RenderedEmail; idempotencyKey: string; }

// Data the handler fetched via service role for a booking event.
export interface BookingContext {
  clientEmail: string; clientFirstName: string; practitionerName: string;
  neighbourhood: string; whenHumanised: string;
}

export function humaniseWhen(startIso: string): string {
  const d = new Date(startIso);
  const day = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "America/Chicago" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" }).format(d);
  return `on ${day} at ${time}`;
}

export function bookingConfirmationJob(bookingId: string, ctx: BookingContext): EmailJob {
  return {
    to: ctx.clientEmail,
    rendered: bookingConfirmationEmail({
      reservationId: bookingId, firstName: ctx.clientFirstName,
      practitionerName: ctx.practitionerName, neighbourhood: ctx.neighbourhood,
      whenHumanised: ctx.whenHumanised,
    }),
    idempotencyKey: `booking-confirmation/${bookingId}`,
  };
}

export function cancellationJob(bookingId: string, ctx: { clientEmail: string; clientFirstName: string; practitionerName: string; }): EmailJob {
  return {
    to: ctx.clientEmail,
    rendered: cancellationEmail({ firstName: ctx.clientFirstName, reservationId: bookingId, practitionerName: ctx.practitionerName }),
    idempotencyKey: `booking-cancellation/${bookingId}`,
  };
}

export function welcomeJob(userId: string, email: string, firstName: string): EmailJob {
  return { to: email, rendered: welcomeEmail({ firstName }), idempotencyKey: `welcome/${userId}` };
}

// Decide whether an event is a cancellation (status transitioned TO CANCELLED).
export function isCancellation(p: WebhookPayload): boolean {
  return p.table === "bookings" && p.type === "UPDATE"
    && (p.old_record?.status as string) !== "CANCELLED"
    && (p.record?.status as string) === "CANCELLED";
}
export function isNewBooking(p: WebhookPayload): boolean {
  return p.table === "bookings" && p.type === "INSERT";
}
export function isNewProfile(p: WebhookPayload): boolean {
  return p.table === "profiles" && p.type === "INSERT";
}

// Minimal client surface resolveJob needs (kept here so resolveJob is importable
// in tests WITHOUT pulling in index.ts's top-level Deno.serve). Mockable.
export interface DbClient {
  from(table: string): {
    select(cols: string): { eq(col: string, val: string): { single(): Promise<{ data: Record<string, unknown> | null }> } };
  };
  auth: { admin: { getUserById(id: string): Promise<{ data: { user: { email?: string } | null } }> } };
}

// Resolve the EmailJob for a webhook payload, fetching related data via `db`.
export async function resolveJob(p: WebhookPayload, db: DbClient): Promise<EmailJob | null> {
  if (isNewBooking(p) || isCancellation(p)) {
    const b = p.record as Record<string, unknown>;
    const bookingId = b.id as string;
    const { data: client } = await db.from("profiles").select("first_name").eq("id", b.client_id as string).single();
    const { data: auth } = await db.auth.admin.getUserById(b.client_id as string);
    const clientEmail = auth?.user?.email ?? "";
    const { data: prov } = await db.from("provider_profiles")
      .select("profiles:profiles!provider_profiles_user_id_fkey(first_name,last_name)")
      .eq("id", b.provider_profile_id as string).single();
    const pr = (prov as Record<string, unknown> | null)?.profiles as { first_name?: string; last_name?: string } | undefined;
    const practitionerName = pr ? `${pr.first_name ?? ""} ${pr.last_name ?? ""}`.trim() : "your practitioner";
    const clientFirstName = (client?.first_name as string) ?? "";
    if (isCancellation(p)) return cancellationJob(bookingId, { clientEmail, clientFirstName, practitionerName });
    return bookingConfirmationJob(bookingId, {
      clientEmail, clientFirstName, practitionerName,
      neighbourhood: (b.location as string) ?? "home",
      whenHumanised: humaniseWhen(b.start_time as string),
    });
  }
  if (isNewProfile(p)) {
    const r = p.record as Record<string, unknown>;
    const userId = r.id as string;
    const { data: auth } = await db.auth.admin.getUserById(userId);
    return welcomeJob(userId, auth?.user?.email ?? "", (r.first_name as string) ?? "");
  }
  return null;
}
```

- [ ] **Step 3: Add logic tests**

Append to `supabase/functions/send-email/logic.test.ts`:
```ts
import {
  humaniseWhen, isCancellation, isNewBooking, isNewProfile,
} from "./logic.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test("event classifiers", () => {
  assert(isNewBooking({ type: "INSERT", table: "bookings", record: {}, old_record: null }));
  assert(isCancellation({ type: "UPDATE", table: "bookings", record: { status: "CANCELLED" }, old_record: { status: "CONFIRMED" } }));
  assert(!isCancellation({ type: "UPDATE", table: "bookings", record: { status: "CANCELLED" }, old_record: { status: "CANCELLED" } }));
  assert(isNewProfile({ type: "INSERT", table: "profiles", record: {}, old_record: null }));
});

Deno.test("humaniseWhen formats in Chicago tz", () => {
  assertEquals(humaniseWhen("2026-06-04T19:00:00.000Z"), "on Thursday at 2:00 PM");
});
```

- [ ] **Step 4: Run + commit**
```bash
deno test supabase/functions/send-email/logic.test.ts
git add supabase/functions/_shared/resend.ts supabase/functions/send-email/logic.ts supabase/functions/send-email/logic.test.ts
git commit -m "feat(functions): resend client + pure event->email routing + tests"
```
Expected: all logic tests pass (rendering + classifiers + humanise).

---

## Task 3: The handler + handler tests

**Files:** Replace `supabase/functions/send-email/index.ts`; create `supabase/functions/send-email/index.test.ts`.

- [ ] **Step 1: Write the handler**

Replace `supabase/functions/send-email/index.ts` with (thin wrapper — `resolveJob` lives in `logic.ts` so tests don't start the server):
```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/resend.ts";
import { resolveJob, type WebhookPayload, type DbClient } from "./logic.ts";

Deno.serve(async (req: Request) => {
  const secret = Deno.env.get("SEND_EMAIL_WEBHOOK_SECRET");
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  let payload: WebhookPayload;
  try { payload = await req.json(); } catch { return new Response("Bad payload", { status: 400 }); }

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const job = await resolveJob(payload, db as unknown as DbClient);
  if (!job || !job.to) return new Response(JSON.stringify({ skipped: true }), { status: 200 });

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = `${Deno.env.get("EMAIL_FROM_NAME") ?? "Faineant"} <${Deno.env.get("EMAIL_FROM_ADDRESS") ?? "noreply@faineantapp.com"}>`;
  if (!apiKey) {
    console.info(`[send-email] no RESEND_API_KEY; would send "${job.rendered.subject}" to ${job.to}`);
    return new Response(JSON.stringify({ delivered: false }), { status: 200 });
  }
  const result = await sendEmail(apiKey, from, job.to, job.rendered, job.idempotencyKey);
  return new Response(JSON.stringify({ delivered: true, id: result.id }), { status: 200 });
});
```

- [ ] **Step 2: Write handler tests (mock client + fetch)**

Create `supabase/functions/send-email/index.test.ts`:
```ts
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { resolveJob } from "./logic.ts";

// Minimal mock of the supabase-js client surface resolveJob uses.
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
```

- [ ] **Step 3: Run tests**
```bash
deno test --allow-net supabase/functions/send-email/index.test.ts
```
Expected: 4 passed. (`--allow-net` is needed because index.ts imports from esm.sh/deno.land at module load; no actual Resend/DB call happens in resolveJob tests since the client is mocked.)

- [ ] **Step 4: Commit**
```bash
git add supabase/functions/send-email/index.ts supabase/functions/send-email/index.test.ts
git commit -m "feat(functions): send-email webhook handler + mocked handler tests"
```

---

## Task 4: Database Webhook triggers (env-configurable)

**Files:** Create `supabase/migrations/<ts>_email_webhooks.sql`.

> Database Webhooks call the function via `supabase_functions.http_request`. The target URL + secret differ per environment, so they're read from Postgres settings (`app.settings.send_email_url`, `app.settings.send_email_secret`). Local/prod set these via `alter database ... set ...` or the dashboard; unset → the trigger no-ops gracefully.

- [ ] **Step 1:** `supabase migration new email_webhooks`

- [ ] **Step 2:** Write:
```sql
-- Fire the send-email Edge Function on booking + profile events via pg_net.
-- URL + secret come from DB settings so the same migration works in every env.
create or replace function public.tg_send_email_webhook()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_url  text := current_setting('app.settings.send_email_url', true);
  v_secret text := current_setting('app.settings.send_email_secret', true);
  v_payload jsonb;
begin
  if v_url is null or v_url = '' then
    return null; -- not configured in this environment; no-op
  end if;
  v_payload := jsonb_build_object(
    'type', tg_op, 'table', tg_table_name,
    'record', to_jsonb(new), 'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end);
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || coalesce(v_secret,'')),
    body := v_payload);
  return null;
end;
$$;

create trigger send_email_on_booking_insert
  after insert on public.bookings
  for each row execute function public.tg_send_email_webhook();

create trigger send_email_on_booking_update
  after update of status on public.bookings
  for each row execute function public.tg_send_email_webhook();

create trigger send_email_on_profile_insert
  after insert on public.profiles
  for each row execute function public.tg_send_email_webhook();
```

- [ ] **Step 3:** `supabase db reset` — applies cleanly. Confirm the triggers exist:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select tgname from pg_trigger where tgname like 'send_email_%' order by tgname;"
```
Expected: 3 triggers. (They no-op because `app.settings.send_email_url` is unset locally — verify `supabase test db` still passes all prior tests, since the trigger returns early.)

- [ ] **Step 4: Commit**
```bash
git add supabase/migrations
git commit -m "feat(db): database-webhook triggers for send-email (env-configurable)"
```

---

## Task 5: Docs + secrets + local smoke (optional) 

**Files:** Create `supabase/functions/send-email/README.md`.

- [ ] **Step 1: Write the README** documenting required secrets and webhook wiring:
```markdown
# send-email Edge Function

Sends transactional email (booking confirmation/cancellation, welcome) via Resend,
triggered by Database Webhooks.

## Secrets (set per environment; never commit)
- `RESEND_API_KEY` — Resend API key
- `SEND_EMAIL_WEBHOOK_SECRET` — shared secret; the DB trigger sends it as `Authorization: Bearer …`
- `EMAIL_FROM_NAME` (default "Faineant"), `EMAIL_FROM_ADDRESS` (default noreply@faineantapp.com)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform.

Set function secrets: `supabase secrets set RESEND_API_KEY=... SEND_EMAIL_WEBHOOK_SECRET=...`

## Webhook wiring (per environment)
The triggers read the function URL + secret from Postgres settings:
```sql
alter database postgres set app.settings.send_email_url = 'https://<ref>.supabase.co/functions/v1/send-email';
alter database postgres set app.settings.send_email_secret = '<SEND_EMAIL_WEBHOOK_SECRET>';
```
Local: serve with `supabase functions serve send-email` and point the setting at the local URL
(`http://host.docker.internal:54321/functions/v1/send-email`).

## Tests
`deno test --allow-net supabase/functions/send-email/`
```

- [ ] **Step 2 (optional local smoke):** If Deno + serve are available, `supabase functions serve send-email` in one shell, then POST a fake booking-insert payload with the secret header and confirm a 200 `{delivered:false}` (no RESEND_API_KEY locally) or a logged "would send". Report the result; skip if environment doesn't allow.

- [ ] **Step 3: Commit**
```bash
git add supabase/functions/send-email/README.md
git commit -m "docs(functions): send-email secrets + webhook wiring notes"
```

---

## Done criteria
- `deno test supabase/functions/send-email/` green (rendering + routing + handler logic, externals mocked).
- `supabase db reset` clean; the 3 webhook triggers exist and no-op when unconfigured; all prior pgTAP still pass.
- No secrets committed; real RESEND_API_KEY / SEND_EMAIL_WEBHOOK_SECRET set as function secrets at deploy.

## Known gaps / deferred
- Real end-to-end (DB event → webhook → Resend delivery) is verified at deploy once secrets + the `app.settings.send_email_url` are set and the function is deployed (`supabase functions deploy send-email`).
- Welcome fires at signup (profiles INSERT); revisit if it should wait for email confirmation.
- Auth confirmation/reset emails remain Supabase Auth's job (Resend SMTP, Plan 2) — this function is only the app's transactional mail.
- Stripe + Google Calendar Edge Functions are Plans 4b/4c.
