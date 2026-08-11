import Link from "next/link";
import type { ReactNode } from "react";

/** Primitivos compartilhados pelas três áreas (pública, empresa, parceiro). */

const TOM_CLASSE = {
  neutro: "border-border bg-surface-2 text-muted",
  espera: "border-espera/40 bg-espera/10 text-espera",
  ok: "border-ok/40 bg-ok/10 text-ok",
  erro: "border-erro/40 bg-erro/10 text-erro",
  gold: "border-gold/40 bg-gold/10 text-gold-soft",
} as const;

export type Tom = keyof typeof TOM_CLASSE;

export function Pill({
  children,
  tom = "neutro",
  title,
}: {
  children: ReactNode;
  tom?: Tom;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs whitespace-nowrap ${TOM_CLASSE[tom]}`}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-surface p-5 ${className}`}>{children}</div>
  );
}

export function PageHeader({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descricao && <p className="text-sm text-muted mt-1.5 max-w-2xl">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}

export function EmptyState({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao: string;
  acao?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/40 px-6 py-14 text-center">
      <p className="font-medium">{titulo}</p>
      <p className="text-sm text-muted mt-2 max-w-md mx-auto">{descricao}</p>
      {acao && <div className="mt-6">{acao}</div>}
    </div>
  );
}

export function Stat({
  label,
  valor,
  detalhe,
  tom,
}: {
  label: string;
  valor: string;
  detalhe?: string;
  tom?: Tom;
}) {
  const cor = tom === "ok" ? "text-ok" : tom === "erro" ? "text-erro" : tom === "espera" ? "text-espera" : "";
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`text-2xl font-semibold mt-2 ${cor}`}>{valor}</p>
      {detalhe && <p className="text-xs text-muted mt-1">{detalhe}</p>}
    </Card>
  );
}

/**
 * Aviso de conteúdo pendente da Fase 0 — placeholders jurídicos que ainda
 * não têm valor definido. Renderizar o marcador é decisão registrada no
 * AGENTS.md: inventar número aqui viraria cobrança errada em produção.
 */
export function AvisoFase0({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-espera/40 bg-espera/5 px-4 py-3 text-sm text-espera/90 flex gap-3">
      <span aria-hidden className="shrink-0">
        ⚠
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Aviso jurídico de rascunho não revisado, usado no topo de /termos/*. */
export function AvisoRascunhoJuridico() {
  return (
    <div className="rounded-lg border border-erro/40 bg-erro/5 px-4 py-3 text-sm text-erro/90">
      <strong className="font-medium">Rascunho não revisado por advogado.</strong> Este texto
      integra a fundação jurídica em construção e ainda não tem validade contratual. Nenhuma
      campanha real opera sob ele.
    </div>
  );
}

const BOTAO_BASE =
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none";

const BOTAO_VARIANTE = {
  primario: "bg-gold text-background hover:bg-gold-soft",
  secundario: "border border-border bg-surface-2 text-foreground hover:border-gold/40",
  fantasma: "text-muted hover:text-foreground",
} as const;

const BOTAO_TAMANHO = {
  md: "px-4 py-2",
  sm: "px-3 py-1.5 text-xs",
} as const;

export function BotaoLink({
  href,
  children,
  variante = "primario",
  tamanho = "md",
}: {
  href: string;
  children: ReactNode;
  variante?: keyof typeof BOTAO_VARIANTE;
  tamanho?: keyof typeof BOTAO_TAMANHO;
}) {
  return (
    <Link href={href} className={`${BOTAO_BASE} ${BOTAO_VARIANTE[variante]} ${BOTAO_TAMANHO[tamanho]}`}>
      {children}
    </Link>
  );
}

export function Botao({
  children,
  variante = "primario",
  tamanho = "md",
  type = "submit",
  disabled,
  className = "",
}: {
  children: ReactNode;
  variante?: keyof typeof BOTAO_VARIANTE;
  tamanho?: keyof typeof BOTAO_TAMANHO;
  type?: "submit" | "button";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`${BOTAO_BASE} ${BOTAO_VARIANTE[variante]} ${BOTAO_TAMANHO[tamanho]} cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}

/** Linha rótulo → valor, usada nas fichas de campanha e indicação. */
export function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-3 border-b border-border/60 last:border-0">
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}
