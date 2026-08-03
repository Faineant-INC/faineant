import { describe, expect, it } from "vitest";
import { destinationAfterLogin, messageForLoginError } from "@/lib/auth-login";

describe("destinationAfterLogin", () => {
  it.each([
    ["CLIENT", "/dashboard"],
    ["PROVIDER", "/dashboard/provider/bookings"],
    ["ADMIN", "/admin"],
  ] as const)("routes %s to its role home", (role, expected) => {
    expect(destinationAfterLogin(role, null)).toBe(expected);
  });

  it("keeps a safe requested application path", () => {
    expect(destinationAfterLogin("CLIENT", "/dashboard/client/profile")).toBe(
      "/dashboard/client/profile",
    );
  });

  it("rejects a protocol-relative redirect", () => {
    expect(destinationAfterLogin("ADMIN", "//example.com")).toBe("/admin");
  });
});

describe("messageForLoginError", () => {
  it("explains the email confirmation gate", () => {
    expect(messageForLoginError({ code: "email_not_confirmed" })).toMatch(/confirm your email/i);
  });

  it("explains the disabled account gate", () => {
    expect(messageForLoginError({ code: "user_banned" })).toMatch(/disabled/i);
  });

  it("keeps invalid credentials generic", () => {
    expect(messageForLoginError({ code: "invalid_credentials" })).toBe(
      "PASSWORD INCORRECT. NOTHING ELSE HAPPENED.",
    );
  });
});
