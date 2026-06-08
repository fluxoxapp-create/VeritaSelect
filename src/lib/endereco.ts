/** Strips formatting, keeping only digits. */
function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

/** The 26 states + Distrito Federal, in the official 2-letter UF form. */
export const ESTADOS_BR = [
  { uf: "AC", nome: "Acre" },
  { uf: "AL", nome: "Alagoas" },
  { uf: "AP", nome: "Amapá" },
  { uf: "AM", nome: "Amazonas" },
  { uf: "BA", nome: "Bahia" },
  { uf: "CE", nome: "Ceará" },
  { uf: "DF", nome: "Distrito Federal" },
  { uf: "ES", nome: "Espírito Santo" },
  { uf: "GO", nome: "Goiás" },
  { uf: "MA", nome: "Maranhão" },
  { uf: "MT", nome: "Mato Grosso" },
  { uf: "MS", nome: "Mato Grosso do Sul" },
  { uf: "MG", nome: "Minas Gerais" },
  { uf: "PA", nome: "Pará" },
  { uf: "PB", nome: "Paraíba" },
  { uf: "PR", nome: "Paraná" },
  { uf: "PE", nome: "Pernambuco" },
  { uf: "PI", nome: "Piauí" },
  { uf: "RJ", nome: "Rio de Janeiro" },
  { uf: "RN", nome: "Rio Grande do Norte" },
  { uf: "RS", nome: "Rio Grande do Sul" },
  { uf: "RO", nome: "Rondônia" },
  { uf: "RR", nome: "Roraima" },
  { uf: "SC", nome: "Santa Catarina" },
  { uf: "SP", nome: "São Paulo" },
  { uf: "SE", nome: "Sergipe" },
  { uf: "TO", nome: "Tocantins" },
] as const;

const UF_CODES = new Set<string>(ESTADOS_BR.map((estado) => estado.uf));

/** Validates a 2-letter Brazilian state code (UF). */
export function isValidUf(rawUf: string): boolean {
  return UF_CODES.has(rawUf.trim().toUpperCase());
}

/** Validates a CEP (Brazilian postal code) — 8 digits, any formatting accepted as input. */
export function isValidCep(rawCep: string): boolean {
  return /^\d{8}$/.test(onlyDigits(rawCep));
}

/** Normalizes a CEP to its stored form: 8 digits, no mask. */
export function normalizeCep(rawCep: string): string {
  return onlyDigits(rawCep);
}

/** Formats a stored CEP for display, e.g. "01310930" -> "01310-930". */
export function formatCep(rawCep: string): string {
  const cep = onlyDigits(rawCep);
  return cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : cep;
}

export type EnderecoInput = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
};

/**
 * Validates a full Brazilian address per Correios conventions: CEP (8 digits),
 * logradouro/bairro/cidade present, número present (or "S/N"), and a real UF.
 * Returns the first validation error message in Portuguese, or null if valid.
 */
export function validateEndereco(input: EnderecoInput): string | null {
  if (!isValidCep(input.cep)) return "CEP inválido. Use o formato 00000-000.";
  if (!input.logradouro.trim()) return "Informe o logradouro (rua, avenida etc.).";
  if (!input.numero.trim()) return "Informe o número (ou \"S/N\" se não houver).";
  if (!input.bairro.trim()) return "Informe o bairro.";
  if (!input.cidade.trim()) return "Informe a cidade.";
  if (!isValidUf(input.uf)) return "Selecione um estado (UF) válido.";
  return null;
}
