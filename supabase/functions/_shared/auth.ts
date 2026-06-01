import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface Caller { userId: string; role: string; }

// Verify the request's user JWT and return the caller. Throws a Response on failure.
export async function getCaller(req: Request): Promise<Caller> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) throw new Response("Unauthorized", { status: 401 });
  const anon = createClient(
    Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) throw new Response("Unauthorized", { status: 401 });
  const svc = serviceClient();
  const { data: profile } = await svc.from("profiles").select("role").eq("id", data.user.id).single();
  return { userId: data.user.id, role: (profile?.role as string) ?? "CLIENT" };
}

export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}
