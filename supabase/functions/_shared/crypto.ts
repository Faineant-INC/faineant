function base64ToBytes(value: string): Uint8Array {
  const decoded = atob(value);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function bytesToBase64(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function keyBytes(): Uint8Array {
  const encoded = Deno.env.get("CALENDAR_TOKEN_KEY");
  if (!encoded) throw new Error("CALENDAR_TOKEN_KEY is not configured");
  const bytes = base64ToBytes(encoded);
  if (bytes.byteLength !== 32) {
    throw new Error("CALENDAR_TOKEN_KEY must decode to exactly 32 bytes");
  }
  return bytes;
}

async function encryptionKey(): Promise<CryptoKey> {
  const bytes = keyBytes();
  const rawKey = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(rawKey).set(bytes);
  return await crypto.subtle.importKey(
    "raw",
    rawKey,
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encrypt(plainText: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      await encryptionKey(),
      new TextEncoder().encode(plainText),
    ),
  );
  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
  combined.set(iv);
  combined.set(encrypted, iv.byteLength);
  return bytesToBase64(combined);
}

export async function decrypt(cipherText: string): Promise<string> {
  const combined = base64ToBytes(cipherText);
  if (combined.byteLength < 29) throw new Error("Invalid encrypted token");
  const plainText = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: combined.slice(0, 12) },
    await encryptionKey(),
    combined.slice(12),
  );
  return new TextDecoder().decode(plainText);
}
