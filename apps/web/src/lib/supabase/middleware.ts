import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@faineant/shared";
import {
  canAccess,
  isProtected,
  isAuthPage,
  roleHome,
  type AppRole,
} from "@/lib/auth.matcher";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  let role: AppRole | null = null;

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role,is_active")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || !profile?.is_active) {
      await supabase.auth.signOut({ scope: "local" });
      user = null;
    } else {
      role = profile.role;
    }
  }

  if (isProtected(pathname) && (!user || !role)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const redirect = NextResponse.redirect(loginUrl);
    response.cookies
      .getAll()
      .forEach((c) => redirect.cookies.set(c.name, c.value, c));
    return redirect;
  }

  if (user && role && !canAccess(pathname, role)) {
    const redirect = NextResponse.redirect(
      new URL(roleHome(role), request.url),
    );
    response.cookies
      .getAll()
      .forEach((c) => redirect.cookies.set(c.name, c.value, c));
    return redirect;
  }

  if (isAuthPage(pathname) && user && role) {
    const redirect = NextResponse.redirect(
      new URL(roleHome(role), request.url),
    );
    response.cookies
      .getAll()
      .forEach((c) => redirect.cookies.set(c.name, c.value, c));
    return redirect;
  }

  return response;
}
