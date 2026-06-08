import "server-only";

/** Strips formatting, keeping only digits. */
function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

/**
 * Validates a CPF using the official check-digit algorithm — rejects
 * malformed input and the all-same-digit numbers (e.g. "111.111.111-11")
 * that pass a naive length check but are never valid CPFs.
 */
export function isValidCpf(rawCpf: string): boolean {
  const cpf = onlyDigits(rawCpf);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);

  const checkDigit = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += digits[i] * (length + 1 - i);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return checkDigit(9) === digits[9] && checkDigit(10) === digits[10];
}

async function sha256Hex(message: string) {
  const data = new TextEncoder().encode(message);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Returns a salted hash (for uniqueness/fraud matching, never reversible to
 * the original CPF) plus the last 4 digits (for support UX, e.g. "termina em
 * 1234"). The pepper lives only in env vars — never in the database.
 */
export async function hashCpf(rawCpf: string) {
  const cpf = onlyDigits(rawCpf);
  const pepper = process.env.CPF_HASH_PEPPER;
  if (!pepper) throw new Error("CPF_HASH_PEPPER is not configured");

  return {
    hash: await sha256Hex(`${cpf}.${pepper}`),
    last4: cpf.slice(-4),
  };
}
