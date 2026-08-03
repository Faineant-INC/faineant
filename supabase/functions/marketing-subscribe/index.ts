import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/resend.ts";
import { createMarketingHandler } from "./handler.ts";
import { SupabaseMarketingStore } from "./store.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const handler = createMarketingHandler({
  store: new SupabaseMarketingStore(supabase),
  sendEmail,
  config: {
    resendApiKey: Deno.env.get("RESEND_API_KEY") ?? "",
    from: `${Deno.env.get("EMAIL_FROM_NAME") ?? "Faineant"} <${
      Deno.env.get("EMAIL_FROM_ADDRESS") ?? "noreply@faineantapp.com"
    }>`,
    supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
    siteUrl: Deno.env.get("WEB_URL") ?? "https://faineantapp.com",
    postalAddress: Deno.env.get("MARKETING_POSTAL_ADDRESS") ?? "",
    signingSecret: Deno.env.get("MARKETING_SIGNING_SECRET") ?? "",
    allowedOrigins: (Deno.env.get("MARKETING_ALLOWED_ORIGINS") ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
});

Deno.serve(handler);
