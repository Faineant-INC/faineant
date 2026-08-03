import { getCaller, serviceClient } from "../_shared/auth.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { fetchIcsText, normalizeIcsUrl, parseIcs } from "../_shared/ics.ts";
import {
  type CalendarConnection,
  syncConnection,
} from "../calendar-sync/sync.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let caller;
  try {
    caller = await getCaller(request);
  } catch (response) {
    return response as Response;
  }
  if (caller.role !== "PROVIDER") return json({ error: "Provider only" }, 403);

  const body = await request.json().catch(() => ({}));
  if (typeof body.feedUrl !== "string" || !body.feedUrl.trim()) {
    return json({ error: "feedUrl is required" }, 400);
  }

  try {
    const feedUrl = normalizeIcsUrl(body.feedUrl).toString();
    parseIcs(await fetchIcsText(feedUrl));
    const db = serviceClient();
    const { data, error } = await db
      .from("calendar_connections")
      .upsert(
        {
          user_id: caller.userId,
          provider: "ICS_FEED",
          feed_url: feedUrl,
          access_token: null,
          refresh_token: null,
          sync_token: null,
          is_active: true,
        },
        { onConflict: "user_id,provider" },
      )
      .select(
        "id,user_id,provider,access_token,refresh_token,external_id,feed_url,sync_token,is_active",
      )
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? "ICS connection failed");
    }
    const eventCount = await syncConnection(db, data as CalendarConnection);
    return json({ connectionId: data.id, eventCount }, 201);
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "ICS connection failed",
      },
      400,
    );
  }
});
