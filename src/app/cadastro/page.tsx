"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "./actions";
import { ESTADOS_BR } from "@/lib/endereco";

export default function CadastroPage() {
  const [state, formAction, pending] = useActionState(signUp, undefined);

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <h1 className="text-2xl font-semibold mb-2">Criar sua conta</h1>
      <p className="text-muted text-sm mb-8">
        Cadastro gratuito. Em poucos minutos você já pode garantir seus acessos.
      </p>

      <form action={formAction} className="space-y-4">
        <div>
          <label className="text-sm text-muted block mb-1.5">Nome completo</label>
          <input
            type="text"
            name="fullName"
            required
            placeholder="Seu nome"
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
          />
        </div>
        <div>
          <label className="text-sm text-muted block mb-1.5">E-mail</label>
          <input
            type="email"
            name="email"
            required
            placeholder="voce@email.com"
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
          />
        </div>
        <div>
          <label className="text-sm text-muted block mb-1.5">CPF</label>
          <input
            type="text"
            name="cpf"
            required
            placeholder="000.000.000-00"
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
          />
        </div>
        <div>
          <label className="text-sm text-muted block mb-1.5">Senha</label>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            placeholder="••••••••"
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
          />
        </div>

        <div className="pt-2">
          <h2 className="text-sm font-medium text-foreground mb-1">Endereço de entrega</h2>
          <p className="text-xs text-muted mb-3">
            Usamos para enviar prêmios físicos a ganhadores e como verificação antifraude.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted block mb-1.5">CEP</label>
            <input
              type="text"
              name="cep"
              required
              inputMode="numeric"
              placeholder="00000-000"
              className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
            />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1.5">Estado (UF)</label>
            <select
              name="uf"
              required
              defaultValue=""
              className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
            >
              <option value="" disabled>
                Selecione
              </option>
              {ESTADOS_BR.map((estado) => (
                <option key={estado.uf} value={estado.uf}>
                  {estado.uf} — {estado.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm text-muted block mb-1.5">Logradouro</label>
          <input
            type="text"
            name="logradouro"
            required
            placeholder="Rua, avenida..."
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted block mb-1.5">Número</label>
            <input
              type="text"
              name="numero"
              required
              placeholder="Nº ou S/N"
              className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
            />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1.5">Complemento</label>
            <input
              type="text"
              name="complemento"
              placeholder="Apto, bloco... (opcional)"
              className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted block mb-1.5">Bairro</label>
            <input
              type="text"
              name="bairro"
              required
              placeholder="Bairro"
              className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
            />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1.5">Cidade</label>
            <input
              type="text"
              name="cidade"
              required
              placeholder="Cidade"
              className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
            />
          </div>
        </div>

        {state?.error && (
          <p className="text-sm text-red-400 border border-red-400/30 rounded-md px-3 py-2">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold-soft transition-colors disabled:opacity-60"
        >
          {pending ? "Criando conta..." : "Criar conta"}
        </button>
      </form>

      <p className="text-xs text-muted mt-4">
        Ao continuar, você concorda com os Termos de Uso e a Política de
        Privacidade da VeritaSelect, em conformidade com a LGPD.
      </p>

      <p className="text-sm text-muted mt-6 text-center">
        Já tem conta?{" "}
        <Link href="/entrar" className="text-gold-soft hover:text-gold">
          Entrar
        </Link>
      </p>

      <div className="mt-8 rounded-xl border border-gold/40 bg-surface p-4 text-sm text-muted">
        É organizador e quer anunciar uma seleção?{" "}
        <Link href="/organizador/solicitar" className="text-gold-soft hover:text-gold">
          Solicite verificação →
        </Link>
      </div>
    </div>
  );
}
