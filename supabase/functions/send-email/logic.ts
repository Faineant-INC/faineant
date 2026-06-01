import { bookingConfirmationEmail, cancellationEmail, welcomeEmail, type RenderedEmail } from "../_shared/email-templates.ts";

export interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

export interface EmailJob { to: string; rendered: RenderedEmail; idempotencyKey: string; }

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

export async function resolveJob(p: WebhookPayload, db: DbClient): Promise<EmailJob | null> {
  if (!p.record) return null;
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
