import { describe, it, expect } from "vitest";
import {
  canAccess,
  isProtected,
  isAuthPage,
  roleHome,
} from "@/lib/auth.matcher";

describe("isProtected", () => {
  it("treats /dashboard/client/bookings as protected", () => {
    expect(isProtected("/dashboard/client/bookings")).toBe(true);
  });

  it("does not treat /providers as protected", () => {
    expect(isProtected("/providers")).toBe(false);
  });

  it("does not match unrelated paths with the same prefix", () => {
    expect(isProtected("/dashboardish")).toBe(false);
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

describe("role route boundaries", () => {
  it("sends each role to its own landing page", () => {
    expect(roleHome("CLIENT")).toBe("/dashboard");
    expect(roleHome("PROVIDER")).toBe("/dashboard/provider/bookings");
    expect(roleHome("ADMIN")).toBe("/admin");
  });

  it("keeps clients out of provider and admin routes", () => {
    expect(canAccess("/dashboard", "CLIENT")).toBe(true);
    expect(canAccess("/dashboard/client/bookings", "CLIENT")).toBe(true);
    expect(canAccess("/dashboard/provider/bookings", "CLIENT")).toBe(false);
    expect(canAccess("/admin", "CLIENT")).toBe(false);
  });

  it("keeps providers in the provider workspace", () => {
    expect(canAccess("/dashboard/provider/bookings", "PROVIDER")).toBe(true);
    expect(canAccess("/dashboard", "PROVIDER")).toBe(false);
    expect(canAccess("/dashboard/client/bookings", "PROVIDER")).toBe(false);
    expect(canAccess("/admin", "PROVIDER")).toBe(false);
  });

  it("allows administrators to inspect protected workspaces", () => {
    expect(canAccess("/admin", "ADMIN")).toBe(true);
    expect(canAccess("/dashboard/provider/bookings", "ADMIN")).toBe(true);
  });
});
