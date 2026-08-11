"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { criarParceiro } from "../actions";

export default function ComecarParceiro() {
  const router = useRouter();
  const [tipoPessoa, setTipoPessoa] = useState<"pf" | "pj">("pf");
  const [state, formAction, pending] = useActionState(criarParceiro, undefined);

  useEffect(() => {
    if (state?.redirectTo) {
      router.replace(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <p className="text-xs uppercase tracking-wide text-gold-soft">Passo final</p>
      <h1 className="text-2xl font-semibold mt-2 mb-2">Seu cadastro de parceiro</h1>
      <p className="text-muted text-sm mb-8">
        Só o necessário para a empresa conseguir pagar você e para a plataforma cumprir as
        obrigações fiscais. Não pedimos disponibilidade, horário nem meta — isso não existe aqui.
      </p>

      <form action={formAction} className="space-y-5">
        <fieldset>
          <legend className="text-sm text-muted mb-2">Você atua como</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["pf", "pj"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipoPessoa(t)}
                aria-pressed={tipoPessoa === t}
                className={`rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                  tipoPessoa === t ? "border-gold/60 bg-gold/5" : "border-border bg-surface"
                }`}
              >
                <span className={`text-sm font-medium ${tipoPessoa === t ? "text-gold-soft" : ""}`}>
                  {t === "pf" ? "Pessoa física" : "Pessoa jurídica"}
                </span>
                <span className="block text-xs text-muted mt-1">
                  {t === "pf"
                    ? "A empresa faz as retenções legais como fonte pagadora"
                    : "O pagamento fica condicionado à emissão de nota fiscal"}
                </span>
              </button>
            ))}
          </div>
          <input type="hidden" name="tipoPessoa" value={tipoPessoa} />
        </fieldset>

        <div>
          <label className="text-sm text-muted block mb-1.5" htmlFor="documento">
            {tipoPessoa === "pf" ? "CPF" : "CNPJ"}
          </label>
          <input
            id="documento"
            name="documento"
            required
            inputMode="numeric"
            placeholder={tipoPessoa === "pf" ? "000.000.000-00" : "00.000.000/0000-00"}
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
          />
        </div>

        <div>
          <label className="text-sm text-muted block mb-1.5" htmlFor="chavePix">
            Chave Pix
          </label>
          <input
            id="chavePix"
            name="chavePix"
            placeholder="CPF, e-mail, telefone ou chave aleatória"
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
          />
          <p className="text-xs text-muted mt-1.5">
            Fica visível apenas para as empresas cujas campanhas você aderir — são elas que pagam
            você diretamente. A plataforma não movimenta valor nenhum.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="text-sm text-muted block mb-1.5" htmlFor="cidade">
              Cidade
            </label>
            <input
              id="cidade"
              name="cidade"
              className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
            />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1.5" htmlFor="uf">
              UF
            </label>
            <input
              id="uf"
              name="uf"
              maxLength={2}
              placeholder="SP"
              className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm uppercase outline-none focus:border-gold/60"
            />
          </div>
        </div>

        <label className="flex gap-3 text-sm text-muted cursor-pointer">
          <input type="checkbox" name="aceite" className="mt-1 shrink-0" />
          <span>
            Li e aceito os{" "}
            <Link href="/termos/parceiro" className="text-gold-soft hover:text-gold" target="_blank">
              Termos de Uso do Parceiro
            </Link>
            . Entendo que atuo de forma autônoma, sem vínculo empregatício, e que a plataforma é
            gratuita para mim.
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
          {pending || state?.redirectTo ? "Concluindo..." : "Concluir cadastro"}
        </button>

        <p className="text-xs text-muted text-center">
          O aceite é registrado com data, hora, IP e o texto integral congelado e hasheado.
        </p>
      </form>
    </div>
  );
}
