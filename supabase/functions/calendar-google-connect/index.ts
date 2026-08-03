import { getCaller } from "../_shared/auth.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { signState } from "../_shared/oauth-state.ts";

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

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

  try {
    const query = new URLSearchParams({
      client_id: required("GOOGLE_CLIENT_ID"),
      redirect_uri: required("GOOGLE_REDIRECT_URI"),
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      scope: "https://www.googleapis.com/auth/calendar.readonly",
      state: await signState(caller.userId),
    });
    return json({
      url: `https://accounts.google.com/o/oauth2/v2/auth?${query}`,
    });
  } catch (error) {
    return json(
      {
        error: error instanceof Error
          ? error.message
          : "Google OAuth is unavailable",
      },
      500,
    );
  }
});
