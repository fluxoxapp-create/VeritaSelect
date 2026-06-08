export const ADMIN_SESSION_COOKIE = "veritaselect_admin_session";

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET não configurado em .env.local");
  return secret;
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toHex(signature);
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function createAdminSessionToken(email: string) {
  const signature = await hmacSha256Hex(getSecret(), email);
  return `${btoa(email)}.${signature}`;
}

/**
 * Verifies an admin session token and returns the authenticated admin's
 * email, or null if the token is missing, malformed, forged, or doesn't
 * match the configured super-admin account.
 */
export async function verifyAdminSessionToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const [encodedEmail, signature] = token.split(".");
  if (!encodedEmail || !signature) return null;

  let email: string;
  try {
    email = atob(encodedEmail);
  } catch {
    return null;
  }

  const expected = await hmacSha256Hex(getSecret(), email);
  if (!constantTimeEqual(signature, expected)) return null;

  return email === process.env.ADMIN_EMAIL ? email : null;
}

export function checkAdminCredentials(email: string, password: string) {
  return email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD;
}
