import "server-only";

/** Strips formatting, keeping only digits. */
function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

/**
 * Validates a CNPJ using the official check-digit algorithm — rejects
 * malformed input and all-same-digit numbers, same approach as isValidCpf.
 */
export function isValidCnpj(rawCnpj: string): boolean {
  const cnpj = onlyDigits(rawCnpj);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const digits = cnpj.split("").map(Number);

  const checkDigit = (length: number) => {
    const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += digits[i] * weights[i];
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return checkDigit(12) === digits[12] && checkDigit(13) === digits[13];
}

async function sha256Hex(message: string) {
  const data = new TextEncoder().encode(message);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Salted hash of a CPF or CNPJ for uniqueness checks (organizers.document_number_hash)
 * — never stores the raw document number. Reuses the same pepper as CPF hashing:
 * both protect the same class of personal/business identifiers.
 */
export async function hashDocumentNumber(rawNumber: string) {
  const digits = onlyDigits(rawNumber);
  const pepper = process.env.CPF_HASH_PEPPER;
  if (!pepper) throw new Error("CPF_HASH_PEPPER is not configured");

  return sha256Hex(`${digits}.${pepper}`);
}
