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
