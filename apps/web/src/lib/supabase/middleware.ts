import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@faineant/shared";
import { isProtected, isAuthPage } from "@/lib/auth.matcher";

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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  if (isProtected(pathname) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const redirect = NextResponse.redirect(loginUrl);
    response.cookies
      .getAll()
      .forEach((c) => redirect.cookies.set(c.name, c.value, c));
    return redirect;
  }

  if (isAuthPage(pathname) && user) {
    const redirect = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies
      .getAll()
      .forEach((c) => redirect.cookies.set(c.name, c.value, c));
    return redirect;
  }

  return response;
}
