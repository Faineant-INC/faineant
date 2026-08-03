import { supabase } from "./supabase";

function sessionUser(
  user: {
    id: string;
    email?: string | null;
  } | null,
  profile: {
    first_name: string;
    last_name: string;
    role: string;
  } | null,
) {
  if (!user || !profile) return null;
  return {
    id: user.id,
    email: user.email ?? "",
    firstName: profile.first_name,
    lastName: profile.last_name,
    role: profile.role,
  };
}

export async function getStoredTokens() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const session = data.session;
  if (!session) {
    return { accessToken: null, refreshToken: null, user: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("first_name,last_name,role,is_active")
    .eq("id", session.user.id)
    .maybeSingle();

  if (profileError || !profile?.is_active || profile.role === "ADMIN") {
    await supabase.auth.signOut({ scope: "local" });
    return { accessToken: null, refreshToken: null, user: null };
  }

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    user: sessionUser(session.user, profile),
  };
}

export async function clearTokens() {
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw new Error(error.message);
}
