export const PROTECTED_PREFIXES = ["/dashboard", "/admin"];
export const AUTH_PAGE_PREFIXES = ["/login", "/register"];

export function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGE_PREFIXES.some((p) => pathname.startsWith(p));
}
