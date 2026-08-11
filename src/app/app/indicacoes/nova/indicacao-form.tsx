"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { registrarIndicacao } from "./actions";
import { formatComissao } from "@/lib/format";

export type OpcaoCampanha = {
  adesaoId: string;
  titulo: string;
  comissaoCents: number;
  recorrente: boolean;
  resultadoUtil: string;
  prazoAnaliseDias: number;
  janelaAtribuicaoDias: number;
};

export function IndicacaoForm({ opcoes }: { opcoes: OpcaoCampanha[] }) {
  const router = useRouter();
  const [adesaoId, setAdesaoId] = useState(opcoes[0].adesaoId);
  const [state, formAction, pending] = useActionState(registrarIndicacao, undefined);

  useEffect(() => {
    if (state?.redirectTo) {
      router.replace(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  const escolhida = opcoes.find((o) => o.adesaoId === adesaoId) ?? opcoes[0];

  return (
    <form action={formAction} className="space-y-8 max-w-2xl">
      <section className="space-y-4">
        <div>
          <label className="text-sm text-muted block mb-1.5" htmlFor="adesaoId">
            Campanha
          </label>
          <select
            id="adesaoId"
            name="adesaoId"
            value={adesaoId}
            onChange={(e) => setAdesaoId(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
          >
            {opcoes.map((o) => (
              <option key={o.adesaoId} value={o.adesaoId}>
                {o.titulo} — {formatComissao(o.comissaoCents, o.recorrente)}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-border bg-surface-2 p-4 text-sm">
          <p className="text-xs uppercase tracking-wide text-muted">O que gera comissão aqui</p>
          <p className="text-muted mt-1.5">{escolhida.resultadoUtil}</p>
          <p className="text-xs text-muted mt-3">
            A empresa tem {escolhida.prazoAnaliseDias} dias para analisar — vencido o prazo, a
            indicação é aprovada automaticamente. A janela de atribuição é de{" "}
            {escolhida.janelaAtribuicaoDias} dias: se o negócio fechar dentro dela, a comissão é
            sua mesmo que você já tenha encerrado a adesão.
          </p>
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="font-medium">O lead</h2>
          <p className="text-sm text-muted mt-1">
            A deduplicação usa, nesta ordem: CNPJ, e-mail, telefone e nome da empresa. Quanto mais
            preciso, menor a chance de colidir com um registro de outro parceiro.
          </p>
        </div>

        <Texto id="leadEmpresaNome" label="Empresa do lead" required />
        <Texto id="leadCnpj" label="CNPJ do lead" opcional inputMode="numeric" ajuda="É a chave de deduplicação mais forte." />

        <div className="grid sm:grid-cols-2 gap-5">
          <Texto id="leadContatoNome" label="Nome do contato" required />
          <Texto id="leadContatoCargo" label="Cargo" opcional />
          <Texto id="leadContatoEmail" label="E-mail do contato" type="email" opcional />
          <Texto id="leadContatoTelefone" label="Telefone" opcional inputMode="tel" />
        </div>

        <Texto
          id="origemDoDado"
          label="Origem do contato"
          required
          ajuda="De onde veio este contato — site da empresa, evento, indicação de cliente. É o que sustenta a base legal do tratamento do dado."
        />

        <div>
          <label className="text-sm text-muted block mb-1.5" htmlFor="observacoes">
            Observações <span className="text-xs">(opcional)</span>
          </label>
          <textarea
            id="observacoes"
            name="observacoes"
            rows={3}
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
          />
          <p className="text-xs text-espera mt-1.5">
            Não insira dado sensível: saúde, biometria, origem racial, opinião política,
            convicção religiosa, filiação sindical ou dado de menor de 18 anos.
          </p>
        </div>
      </section>

      <section className="space-y-4 border-t border-border/60 pt-6">
        <label className="flex gap-3 text-sm text-muted cursor-pointer">
          <input type="checkbox" name="registroPrevio" className="mt-1 shrink-0" />
          <span>
            Confirmo que este lead <strong className="text-foreground">ainda não teve contato</strong>{" "}
            com a empresa desta campanha. Registro posterior a um contato já iniciado não gera
            comissão.
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
          className="rounded-md bg-gold text-background font-medium px-5 py-2.5 hover:bg-gold-soft transition-colors disabled:opacity-50 cursor-pointer"
        >
          {pending || state?.redirectTo ? "Registrando..." : "Registrar indicação"}
        </button>

        <p className="text-xs text-muted">
          O registro grava data, hora e IP. É esse carimbo que decide a atribuição se outro
          parceiro indicar o mesmo lead.
        </p>
      </section>
    </form>
  );
}

function Texto({
  id,
  label,
  required,
  opcional,
  type = "text",
  inputMode,
  ajuda,
}: {
  id: string;
  label: string;
  required?: boolean;
  opcional?: boolean;
  type?: string;
  inputMode?: "numeric" | "tel";
  ajuda?: string;
}) {
  return (
    <div>
      <label className="text-sm text-muted block mb-1.5" htmlFor={id}>
        {label}
        {opcional && <span className="text-xs"> (opcional)</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        inputMode={inputMode}
        className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
      />
      {ajuda && <p className="text-xs text-muted mt-1.5">{ajuda}</p>}
    </div>
  );
}
