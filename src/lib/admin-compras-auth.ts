import "server-only";

export const ADMIN_COMPRAS_COOKIE = "veritaselect_compras_session";
const SESSION_HOURS = 2;

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("ADMIN_SESSION_SECRET não configurado");
  return s;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toHex(sig);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let m = 0;
  for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return m === 0;
}

/** Constant-time check of the 4-digit PIN against ADMIN_COMPRAS_PIN env var. */
export function checkComprasPin(pin: string): boolean {
  const expected = process.env.ADMIN_COMPRAS_PIN ?? "";
  if (!expected || pin.length !== expected.length) return false;
  return constantTimeEqual(pin, expected);
}

/** Creates a signed session token valid for SESSION_HOURS. */
export async function createComprasToken(): Promise<string> {
  const ts = Math.floor(Date.now() / 1000);
  const sig = await hmac(getSecret(), `compras.${ts}`);
  return `${ts}.${sig}`;
}

/** Returns true if the token is valid and not expired. */
export async function verifyComprasToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const tsStr = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const ts = Number(tsStr);
  if (!Number.isFinite(ts)) return false;
  const age = Math.floor(Date.now() / 1000) - ts;
  if (age < 0 || age > SESSION_HOURS * 3600) return false;
  const expected = await hmac(getSecret(), `compras.${ts}`);
  return constantTimeEqual(sig, expected);
}
