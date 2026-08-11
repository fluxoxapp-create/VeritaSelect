/**
 * Formatação de valores. Todo dinheiro no sistema é INTEIRO EM CENTAVOS
 * (convenção técnica 1 do AGENTS.md) — float em dinheiro acumula erro e
 * vira divergência de fatura.
 */

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCents(cents: number): string {
  return BRL.format(cents / 100);
}

/**
 * Valor pendente de definição (placeholder `[ ]` da Fase 0). Renderiza o
 * marcador em vez de inventar número — decisão registrada no AGENTS.md.
 */
export function formatCentsOuPendente(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "a definir";
  return formatCents(cents);
}

/** "R$ 300" ou "R$ 129/mês" conforme a comissão seja pontual ou recorrente. */
export function formatComissao(cents: number, recorrente: boolean): string {
  return recorrente ? `${formatCents(cents)}/mês` : formatCents(cents);
}

/**
 * Converte "1.234,56", "1234,56" ou "1234.56" em centavos. Retorna null para
 * entrada inválida — o chamador decide a mensagem de erro.
 */
export function parseCents(input: string): number | null {
  const limpo = input.trim().replace(/[R$\s]/g, "");
  if (!limpo) return null;
  // "1.234,56" (pt-BR) → "1234.56"
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return null;
  return Math.round(Number(normalizado) * 100);
}

const DATA = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const DATA_HORA = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function formatData(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return DATA.format(new Date(value));
}

export function formatDataHora(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return DATA_HORA.format(new Date(value));
}

/** "em 4 dias" / "há 2 dias" — usado nos contadores de prazo. */
export function diasAte(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const alvo = new Date(value).getTime();
  return Math.ceil((alvo - Date.now()) / 86_400_000);
}

export function formatPrazo(value: string | Date | null | undefined): string {
  const dias = diasAte(value);
  if (dias === null) return "—";
  if (dias < 0) return `vencido há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}`;
  if (dias === 0) return "vence hoje";
  return `em ${dias} ${dias === 1 ? "dia" : "dias"}`;
}

export function formatCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
