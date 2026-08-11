"use client";

import { useActionState } from "react";
import { salvarDadosParceiro, alterarSenha } from "./actions";

export function DadosParceiroForm({
  chavePix,
  cidade,
  uf,
  bio,
}: {
  chavePix: string;
  cidade: string;
  uf: string;
  bio: string;
}) {
  const [state, action, pending] = useActionState(salvarDadosParceiro, undefined);

  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="text-sm text-muted block mb-1.5" htmlFor="chavePix">
          Chave Pix
        </label>
        <input
          id="chavePix"
          name="chavePix"
          defaultValue={chavePix}
          placeholder="CPF, e-mail, telefone ou chave aleatória"
          className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
        />
        <p className="text-xs text-muted mt-1.5">
          Visível apenas para as empresas cujas campanhas você aderiu — são elas que pagam você
          diretamente. A plataforma não movimenta valor nenhum.
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
            defaultValue={cidade}
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
            defaultValue={uf}
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm uppercase outline-none focus:border-gold/60"
          />
        </div>
      </div>

      <div>
        <label className="text-sm text-muted block mb-1.5" htmlFor="bio">
          Sobre você <span className="text-xs">(opcional)</span>
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={bio}
          className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
        />
      </div>

      {state?.error && <p className="text-sm text-erro">{state.error}</p>}
      {state?.ok && <p className="text-sm text-ok">{state.ok}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gold text-background text-sm font-medium px-4 py-2 hover:bg-gold-soft transition-colors disabled:opacity-50 cursor-pointer"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}

export function SenhaForm() {
  const [state, action, pending] = useActionState(alterarSenha, undefined);

  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="text-sm text-muted block mb-1.5" htmlFor="novaSenha">
          Nova senha
        </label>
        <input
          id="novaSenha"
          name="novaSenha"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
        />
      </div>
      <div>
        <label className="text-sm text-muted block mb-1.5" htmlFor="confirmacao">
          Confirme a nova senha
        </label>
        <input
          id="confirmacao"
          name="confirmacao"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
        />
      </div>

      {state?.error && <p className="text-sm text-erro">{state.error}</p>}
      {state?.ok && <p className="text-sm text-ok">{state.ok}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-border text-sm px-4 py-2 text-muted hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
      >
        {pending ? "Alterando..." : "Alterar senha"}
      </button>
    </form>
  );
}
