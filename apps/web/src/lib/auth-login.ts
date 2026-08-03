import { roleHome, type AppRole } from "@/lib/auth.matcher";

const GENERIC_LOGIN_ERROR = "PASSWORD INCORRECT. NOTHING ELSE HAPPENED.";

export function destinationAfterLogin(role: AppRole, requestedPath: string | null): string {
  if (requestedPath?.startsWith("/") && !requestedPath.startsWith("//")) {
    return requestedPath;
  }
  return roleHome(role);
}

export function messageForLoginError(reason: unknown): string {
  const code =
    typeof reason === "object" && reason !== null && "code" in reason ? String(reason.code) : "";

  if (code === "email_not_confirmed") {
    return "CONFIRM YOUR EMAIL BEFORE OPENING THE DOOR.";
  }
  if (code === "user_banned") {
    return "THIS ACCOUNT IS DISABLED. CONTACT SUPPORT.";
  }
  return GENERIC_LOGIN_ERROR;
}
