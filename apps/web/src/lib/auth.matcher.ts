export const PROTECTED_PREFIXES = ["/dashboard", "/admin"];
export const AUTH_PAGE_PREFIXES = ["/login", "/register"];
export type AppRole = "CLIENT" | "PROVIDER" | "ADMIN";

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => matchesPrefix(pathname, p));
}

export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGE_PREFIXES.some((p) => matchesPrefix(pathname, p));
}

export function roleHome(role: AppRole): string {
  if (role === "ADMIN") return "/admin";
  if (role === "PROVIDER") return "/dashboard/provider/bookings";
  return "/dashboard";
}

export function canAccess(pathname: string, role: AppRole): boolean {
  if (!isProtected(pathname) || role === "ADMIN") return true;
  if (matchesPrefix(pathname, "/admin")) return false;
  if (role === "PROVIDER") {
    return matchesPrefix(pathname, "/dashboard/provider");
  }
  return !matchesPrefix(pathname, "/dashboard/provider");
}
