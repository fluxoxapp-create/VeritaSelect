"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { criarEmpresa } from "../actions";

export default function ComecarEmpresa() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(criarEmpresa, undefined);

  useEffect(() => {
    if (state?.redirectTo) {
      router.replace(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <p className="text-xs uppercase tracking-wide text-gold-soft">Passo final</p>
      <h1 className="text-2xl font-semibold mt-2 mb-2">Cadastro da empresa</h1>
      <p className="text-muted text-sm mb-8">
        A empresa passa por verificação antes de publicar a primeira campanha. Enquanto isso
        você já consegue montar campanhas em rascunho.
      </p>

      <form action={formAction} className="space-y-5">
        <Campo id="razaoSocial" label="Razão social" required />
        <Campo id="nomeFantasia" label="Nome fantasia" required ajuda="É este o nome que os parceiros veem nas campanhas." />
        <Campo id="cnpj" label="CNPJ" required placeholder="00.000.000/0000-00" inputMode="numeric" />

        <div className="pt-2 border-t border-border/60">
          <p className="text-sm font-medium mb-1">Representante legal</p>
          <p className="text-xs text-muted mb-4">
            Usado para validar poderes de representação. O CPF é guardado apenas em hash.
          </p>
          <div className="space-y-5">
            <Campo id="representanteNome" label="Nome completo" required />
            <Campo id="representanteCpf" label="CPF" required placeholder="000.000.000-00" inputMode="numeric" />
          </div>
        </div>

        <div className="pt-2 border-t border-border/60 space-y-5">
          <Campo id="emailContato" label="E-mail de contato" type="email" required />
          <Campo id="site" label="Site" placeholder="https://" />
        </div>

        <label className="flex gap-3 text-sm text-muted cursor-pointer">
          <input type="checkbox" name="aceite" className="mt-1 shrink-0" />
          <span>
            Li e aceito os{" "}
            <Link href="/termos/empresa" className="text-gold-soft hover:text-gold" target="_blank">
              Termos de Uso da Empresa
            </Link>{" "}
            e o{" "}
            <Link href="/termos/dpa" className="text-gold-soft hover:text-gold" target="_blank">
              Anexo DPA
            </Link>
            . Estou ciente de que a{" "}
            <strong className="text-foreground">aprovação tácita</strong> por decurso de prazo gera
            comissão ao parceiro e taxa à plataforma.
          </span>
        </label>

        {state?.error && (
          <p className="text-sm text-erro border border-erro/30 rounded-md px-3 py-2">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !!state?.redirectTo}
          className="w-full py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold-soft transition-colors disabled:opacity-60 cursor-pointer"
        >
          {pending || state?.redirectTo ? "Cadastrando..." : "Cadastrar empresa"}
        </button>
      </form>
    </div>
  );
}

function Campo({
  id,
  label,
  required,
  placeholder,
  type = "text",
  inputMode,
  ajuda,
}: {
  id: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  inputMode?: "numeric";
  ajuda?: string;
}) {
  return (
    <div>
      <label className="text-sm text-muted block mb-1.5" htmlFor={id}>
        {label}
        {!required && <span className="text-xs"> (opcional)</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
      />
      {ajuda && <p className="text-xs text-muted mt-1.5">{ajuda}</p>}
    </div>
  );
}
