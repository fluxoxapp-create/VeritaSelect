import Link from "next/link";
import type { ReactNode } from "react";

export type ItemNav = {
  href: string;
  label: string;
  /** Contador opcional — fila de aprovação, disputas abertas etc. */
  badge?: number;
};

/**
 * Casca das áreas autenticadas (/app do parceiro e /empresa). Server
 * Component de propósito: o menu não depende de estado de cliente, e assim a
 * navegação lateral não custa JavaScript no bundle.
 */
export function AreaShell({
  titulo,
  subtitulo,
  itens,
  aviso,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  itens: ItemNav[];
  /** Faixa de alerta acima do conteúdo (KYB pendente, pendência de pagamento). */
  aviso?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-xs uppercase tracking-wide text-muted">{titulo}</p>
          {subtitulo && (
            <p className="text-sm font-medium mt-1 truncate" title={subtitulo}>
              {subtitulo}
            </p>
          )}
          <nav className="mt-5 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {itens.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-surface-2 transition-colors whitespace-nowrap"
              >
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="rounded-full bg-gold/20 text-gold-soft text-[11px] px-2 py-0.5">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          {aviso && <div className="mb-6">{aviso}</div>}
          {children}
        </div>
      </div>
    </div>
  );
}
