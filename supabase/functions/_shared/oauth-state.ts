interface OAuthState {
  userId: string;
  expiresAt: number;
  nonce: string;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const standard = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = standard.padEnd(Math.ceil(standard.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signingKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("STATE_SIGNING_SECRET");
  if (!secret || secret.length < 32) {
    throw new Error("STATE_SIGNING_SECRET must contain at least 32 characters");
  }
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function signature(payload: string): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      await signingKey(),
      new TextEncoder().encode(payload),
    ),
  );
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export async function signState(
  userId: string,
  ttlSeconds = 600,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<string> {
  const state: OAuthState = {
    userId,
    expiresAt: nowSeconds + ttlSeconds,
    nonce: crypto.randomUUID(),
  };
  const payload = toBase64Url(
    new TextEncoder().encode(JSON.stringify(state)),
  );
  return `${payload}.${toBase64Url(await signature(payload))}`;
}

export async function verifyState(
  token: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<string | null> {
  const [payload, encodedSignature, extra] = token.split(".");
  if (!payload || !encodedSignature || extra) return null;
  try {
    if (
      !constantTimeEqual(
        await signature(payload),
        fromBase64Url(encodedSignature),
      )
    ) {
      return null;
    }
    const state = JSON.parse(
      new TextDecoder().decode(fromBase64Url(payload)),
    ) as Partial<OAuthState>;
    if (
      typeof state.userId !== "string" ||
      typeof state.expiresAt !== "number" ||
      typeof state.nonce !== "string" ||
      state.expiresAt < nowSeconds
    ) {
      return null;
    }
    return state.userId;
  } catch {
    return null;
  }
}
