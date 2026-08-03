import { getCaller, serviceClient } from "../_shared/auth.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { type CalendarConnection, syncConnection } from "./sync.ts";

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
  const connectionId = typeof body.connectionId === "string"
    ? body.connectionId
    : null;
  const db = serviceClient();
  let query = db
    .from("calendar_connections")
    .select(
      "id,user_id,provider,access_token,refresh_token,external_id,feed_url,sync_token,is_active",
    )
    .eq("user_id", caller.userId)
    .eq("is_active", true);
  if (connectionId) query = query.eq("id", connectionId);
  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);
  if (connectionId && !data?.length) {
    return json({ error: "Calendar connection not found" }, 404);
  }

  try {
    let importedEvents = 0;
    for (const connection of (data ?? []) as CalendarConnection[]) {
      importedEvents += await syncConnection(db, connection);
    }
    return json({
      syncedConnections: data?.length ?? 0,
      importedEvents,
    });
  } catch (error) {
    console.error("[calendar-sync] failed", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Calendar sync failed",
      },
      502,
    );
  }
});
