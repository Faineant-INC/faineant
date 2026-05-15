import { prisma } from "../config/database";
import { hashPassword, comparePassword } from "../utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { AppError } from "../middleware/error-handler";
import { RegisterInput, LoginInput } from "@faineant/shared";
import { env } from "../config/env";
import { sendEmail } from "./email";
import { emailVerificationEmail } from "./email-templates";
import crypto from "crypto";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const VERIFICATION_TOKEN_TTL_HOURS = 24;

function generateSlug(firstName: string, lastName: string): string {
  const base = `${firstName}-${lastName}`.toLowerCase().replace(/[^a-z0-9-]/g, "");
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${base}-${suffix}`;
}

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

async function issueVerificationEmail(userId: string, email: string, firstName: string): Promise<void> {
  const token = generateVerificationToken();
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

  await prisma.emailVerificationToken.create({
    data: { userId, token, expiresAt },
  });

  const verifyUrl = `${env.WEB_URL}/verify-email?token=${token}`;
  const rendered = emailVerificationEmail({
    firstName,
    verifyUrl,
    expiresInHours: VERIFICATION_TOKEN_TTL_HOURS,
  });

  try {
    await sendEmail(rendered, email);
  } catch (err) {
    // Log but don't fail registration — token is in DB and can be re-issued.
    console.error("[auth] failed to send verification email", err);
  }
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError(409, "CONFLICT", "Email already registered");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      role: input.role,
      emailVerified: false,
      providerProfile:
        input.role === "PROVIDER"
          ? {
              create: {
                slug: generateSlug(input.firstName, input.lastName),
              },
            }
          : undefined,
    },
    include: { providerProfile: true },
  });

  await issueVerificationEmail(user.id, user.email, user.firstName);

  const tokens = await generateTokens(user.id, user.role);

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerified,
      providerProfile: user.providerProfile,
    },
    ...tokens,
  };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { providerProfile: true },
  });

  if (!user || !user.isActive) {
    throw new AppError(401, "UNAUTHORIZED", "Invalid email or password");
  }

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, "UNAUTHORIZED", "Invalid email or password");
  }

  const tokens = await generateTokens(user.id, user.role);

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerified,
      providerProfile: user.providerProfile,
    },
    ...tokens,
  };
}

export async function verifyEmail(token: string) {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record) {
    throw new AppError(400, "INVALID_TOKEN", "Verification link is invalid");
  }

  // Idempotent — if already consumed, return success (and the user is already verified).
  if (record.consumedAt) {
    return {
      user: {
        id: record.user.id,
        email: record.user.email,
        emailVerified: true,
      },
      alreadyVerified: true,
    };
  }

  if (record.expiresAt < new Date()) {
    throw new AppError(400, "TOKEN_EXPIRED", "Verification link has expired");
  }

  const [, updatedUser] = await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    }),
  ]);

  return {
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      emailVerified: updatedUser.emailVerified,
    },
    alreadyVerified: false,
  };
}

export async function resendVerification(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always return success — don't leak whether an email is registered.
  if (!user || user.emailVerified) {
    return { sent: false };
  }

  await issueVerificationEmail(user.id, user.email, user.firstName);
  return { sent: true };
}

export async function refreshAccessToken(refreshToken: string) {
  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!stored || stored.expiresAt < new Date()) {
    if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired refresh token");
  }

  let payload: { userId: string; role: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired refresh token");
  }

  const accessToken = signAccessToken({ userId: payload.userId, role: payload.role });

  return { accessToken };
}

export async function logout(refreshToken: string) {
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
}

async function generateTokens(userId: string, role: string) {
  const accessToken = signAccessToken({ userId, role });
  const refreshToken = signRefreshToken({ userId, role });

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  return { accessToken, refreshToken };
}
