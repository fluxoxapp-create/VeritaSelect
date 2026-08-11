"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { registrarDenuncia } from "./actions";
import { MOTIVOS_DENUNCIA } from "@/lib/domain/denuncias";

function DenunciaForm() {
  const searchParams = useSearchParams();
  const campanha = searchParams.get("campanha") ?? "";
  const [state, action, pending] = useActionState(registrarDenuncia, undefined);

  if (state?.ok) {
    return (
      <div className="rounded-xl border border-ok/40 bg-ok/5 p-5">
        <p className="text-sm text-ok">{state.ok}</p>
        <Link href="/" className="text-sm text-muted hover:text-foreground mt-4 inline-block">
          ← Voltar ao início
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="campanha" value={campanha} />

      {campanha && (
        <p className="text-sm text-muted rounded-md border border-border bg-surface px-3 py-2">
          Denúncia sobre a campanha <code className="text-gold-soft">{campanha}</code>
        </p>
      )}

      <div>
        <label className="text-sm text-muted block mb-1.5" htmlFor="motivo">
          Motivo
        </label>
        <select
          id="motivo"
          name="motivo"
          required
          defaultValue=""
          className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
        >
          <option value="" disabled>
            Escolha um motivo
          </option>
          {MOTIVOS_DENUNCIA.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm text-muted block mb-1.5" htmlFor="descricao">
          O que aconteceu
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={6}
          required
          minLength={30}
          placeholder="Descreva com datas, nomes e o que foi dito. Quanto mais concreto, mais rápida é a apuração."
          className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-erro border border-erro/30 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gold text-background font-medium px-5 py-2.5 hover:bg-gold-soft transition-colors disabled:opacity-50 cursor-pointer"
      >
        {pending ? "Enviando..." : "Enviar denúncia"}
      </button>
    </form>
  );
}

export default function DenunciaPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Canal de denúncia</h1>
      <p className="text-sm text-muted mt-2 mb-8">
        Aberto a parceiros e empresas, com prazo de resposta de 48 horas. Campanha denunciada
        pode ser suspensa enquanto a apuração corre. Toda sanção é precedida de notificação e
        prazo de 5 dias para defesa — salvo fraude evidente ou ordem judicial.
      </p>
      <Suspense fallback={null}>
        <DenunciaForm />
      </Suspense>
    </div>
  );
}
