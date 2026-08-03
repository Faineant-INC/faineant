import { serviceClient } from "../_shared/auth.ts";
import { encrypt } from "../_shared/crypto.ts";
import {
  exchangeCode,
  getPrimaryCalendarId,
} from "../_shared/google-calendar.ts";
import { redirect } from "../_shared/http.ts";
import { verifyState } from "../_shared/oauth-state.ts";
import {
  type CalendarConnection,
  syncConnection,
} from "../calendar-sync/sync.ts";

function dashboardRedirect(result: "connected" | "error"): string {
  const base = Deno.env.get("WEB_URL") ?? "https://faineantapp.com";
  const url = new URL("/dashboard/provider/integrations", base);
  url.searchParams.set("calendar", result);
  return url.toString();
}

Deno.serve(async (request) => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return new Response("Missing OAuth code or state", { status: 400 });
  }

  try {
    const userId = await verifyState(state);
    if (!userId) {
      return new Response("Invalid or expired OAuth state", { status: 400 });
    }
    const tokens = await exchangeCode(code);
    const calendarId = await getPrimaryCalendarId(tokens.accessToken);
    const connection: Record<string, unknown> = {
      user_id: userId,
      provider: "GOOGLE",
      access_token: await encrypt(tokens.accessToken),
      external_id: calendarId,
      sync_token: null,
      is_active: true,
    };
    if (tokens.refreshToken) {
      connection.refresh_token = await encrypt(tokens.refreshToken);
    }

    const db = serviceClient();
    const { data, error } = await db
      .from("calendar_connections")
      .upsert(connection, { onConflict: "user_id,provider" })
      .select(
        "id,user_id,provider,access_token,refresh_token,external_id,feed_url,sync_token,is_active",
      )
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? "Calendar connection failed");
    }
    await syncConnection(db, data as CalendarConnection);
    return redirect(dashboardRedirect("connected"));
  } catch (error) {
    console.error("[calendar-google-callback] failed", error);
    return redirect(dashboardRedirect("error"));
  }
});
