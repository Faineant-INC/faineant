import { describe, it, expect, beforeEach, vi } from "vitest";

// Hoisted shared state so vi.mock factories can reference it.
const { state, sendEmailSpy } = vi.hoisted(() => ({
  state: {
    users: new Map<string, any>(),
    tokens: new Map<string, any>(),
    refreshTokens: new Map<string, any>(),
  },
  sendEmailSpy: vi.fn(async (..._args: unknown[]) => ({ delivered: false })),
}));

// ─── Prisma mock ────────────────────────────────────────────────────────────
// In-memory fixtures keyed by primary fields. Reset between tests.
type UserRow = {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  phone?: string | null;
};

type TokenRow = {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  consumedAt: Date | null;
};

function nextId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

vi.mock("../../config/database", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email?: string; id?: string } }) => {
        if (where.email) {
          for (const u of state.users.values()) if (u.email === where.email) return u;
          return null;
        }
        if (where.id) return state.users.get(where.id) ?? null;
        return null;
      }),
      create: vi.fn(async ({ data }: { data: Omit<UserRow, "id"> }) => {
        const id = nextId("u");
        const row: UserRow = {
          id,
          email: data.email,
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role ?? "CLIENT",
          isActive: true,
          emailVerified: data.emailVerified ?? false,
          phone: data.phone ?? null,
        };
        state.users.set(id, row);
        return { ...row, providerProfile: null };
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<UserRow> }) => {
        const row = state.users.get(where.id);
        if (!row) throw new Error("user not found");
        const updated = { ...row, ...data };
        state.users.set(where.id, updated);
        return updated;
      }),
    },
    emailVerificationToken: {
      create: vi.fn(async ({ data }: { data: { userId: string; token: string; expiresAt: Date } }) => {
        const id = nextId("evt");
        const row: TokenRow = {
          id,
          userId: data.userId,
          token: data.token,
          expiresAt: data.expiresAt,
          consumedAt: null,
        };
        state.tokens.set(id, row);
        return row;
      }),
      findUnique: vi.fn(async ({ where }: { where: { token: string } }) => {
        for (const t of state.tokens.values()) {
          if (t.token === where.token) {
            const user = state.users.get(t.userId);
            return { ...t, user };
          }
        }
        return null;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<TokenRow> }) => {
        const t = state.tokens.get(where.id);
        if (!t) throw new Error("token not found");
        const updated = { ...t, ...data };
        state.tokens.set(where.id, updated);
        return updated;
      }),
    },
    refreshToken: {
      create: vi.fn(async ({ data }: { data: { token: string; userId: string; expiresAt: Date } }) => {
        const id = nextId("rt");
        const row = { id, ...data };
        state.refreshTokens.set(id, row);
        return row;
      }),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

vi.mock("../email", () => ({
  sendEmail: sendEmailSpy,
}));

import * as authService from "../auth.service";

describe("auth.service email verification", () => {
  beforeEach(() => {
    state.users.clear();
    state.tokens.clear();
    state.refreshTokens.clear();
    sendEmailSpy.mockClear();
  });

  describe("register", () => {
    it("creates an unverified user and triggers a verification email", async () => {
      const result = await authService.register({
        email: "client@example.com",
        password: "longenoughpw1!",
        firstName: "Sasha",
        lastName: "Vega",
        role: "CLIENT",
      });

      expect(result.user.emailVerified).toBe(false);
      expect(sendEmailSpy).toHaveBeenCalledOnce();
      expect(sendEmailSpy.mock.calls[0]?.[1]).toBe("client@example.com");

      // A token row was created for the new user.
      const tokens = Array.from(state.tokens.values()).filter(
        (t) => t.userId === result.user.id,
      );
      expect(tokens).toHaveLength(1);
      expect(tokens[0]?.consumedAt).toBeNull();
      expect(tokens[0]?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("verifyEmail", () => {
    async function seedRegistered() {
      const result = await authService.register({
        email: "maeve@example.com",
        password: "longenoughpw1!",
        firstName: "Maeve",
        lastName: "Le Gal",
        role: "CLIENT",
      });
      const token = Array.from(state.tokens.values()).find(
        (t) => t.userId === result.user.id,
      );
      if (!token) throw new Error("expected token");
      return { user: result.user, token };
    }

    it("marks the user verified on happy path", async () => {
      const { user, token } = await seedRegistered();
      const res = await authService.verifyEmail(token.token);
      expect(res.user.emailVerified).toBe(true);
      expect(res.alreadyVerified).toBe(false);
      expect(state.users.get(user.id)?.emailVerified).toBe(true);
      expect(state.tokens.get(token.id)?.consumedAt).not.toBeNull();
    });

    it("is idempotent on double-submit (alreadyVerified=true)", async () => {
      const { token } = await seedRegistered();
      await authService.verifyEmail(token.token);
      const second = await authService.verifyEmail(token.token);
      expect(second.user.emailVerified).toBe(true);
      expect(second.alreadyVerified).toBe(true);
    });

    it("rejects expired tokens", async () => {
      const { token } = await seedRegistered();
      const t = state.tokens.get(token.id);
      if (!t) throw new Error("token gone");
      t.expiresAt = new Date(Date.now() - 60_000);
      state.tokens.set(token.id, t);
      await expect(authService.verifyEmail(token.token)).rejects.toMatchObject({
        code: "TOKEN_EXPIRED",
      });
    });

    it("rejects unknown tokens", async () => {
      await expect(authService.verifyEmail("doesnotexist")).rejects.toMatchObject({
        code: "INVALID_TOKEN",
      });
    });
  });

  describe("resendVerification", () => {
    it("issues a new token + email for an unverified user", async () => {
      const reg = await authService.register({
        email: "x@example.com",
        password: "longenoughpw1!",
        firstName: "X",
        lastName: "Y",
        role: "CLIENT",
      });
      sendEmailSpy.mockClear();

      const res = await authService.resendVerification("x@example.com");
      expect(res.sent).toBe(true);
      expect(sendEmailSpy).toHaveBeenCalledOnce();
      const tokensForUser = Array.from(state.tokens.values()).filter(
        (t) => t.userId === reg.user.id,
      );
      expect(tokensForUser).toHaveLength(2);
    });

    it("returns sent=false for unknown emails (no enumeration)", async () => {
      const res = await authService.resendVerification("ghost@example.com");
      expect(res.sent).toBe(false);
      expect(sendEmailSpy).not.toHaveBeenCalled();
    });

    it("returns sent=false when user is already verified", async () => {
      const reg = await authService.register({
        email: "verified@example.com",
        password: "longenoughpw1!",
        firstName: "V",
        lastName: "Y",
        role: "CLIENT",
      });
      const row = state.users.get(reg.user.id);
      if (row) {
        row.emailVerified = true;
        state.users.set(reg.user.id, row);
      }
      sendEmailSpy.mockClear();
      const res = await authService.resendVerification("verified@example.com");
      expect(res.sent).toBe(false);
      expect(sendEmailSpy).not.toHaveBeenCalled();
    });
  });
});
