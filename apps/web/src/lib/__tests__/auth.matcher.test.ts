import { describe, it, expect } from "vitest";
import { isProtected, isAuthPage } from "@/lib/auth.matcher";

describe("isProtected", () => {
  it("treats /dashboard/client/bookings as protected", () => {
    expect(isProtected("/dashboard/client/bookings")).toBe(true);
  });

  it("does not treat /providers as protected", () => {
    expect(isProtected("/providers")).toBe(false);
  });
});

describe("isAuthPage", () => {
  it("treats /login as an auth page", () => {
    expect(isAuthPage("/login")).toBe(true);
  });

  it("does not treat / as an auth page", () => {
    expect(isAuthPage("/")).toBe(false);
  });
});
