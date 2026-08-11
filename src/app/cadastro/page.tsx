"use client";

import Link from "next/link";
import { Suspense, useActionState, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signUp } from "./actions";

type Perfil = "parceiro" | "empresa";

function CadastroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const perfilInicial: Perfil = searchParams.get("perfil") === "empresa" ? "empresa" : "parceiro";
  const [perfil, setPerfil] = useState<Perfil>(perfilInicial);

  const [state, formAction, pending] = useActionState(signUp, undefined);

  useEffect(() => {
    if (state?.redirectTo) {
      router.replace(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-8">
        <OpcaoPerfil
          ativo={perfil === "parceiro"}
          onClick={() => setPerfil("parceiro")}
          titulo="Sou parceiro"
          descricao="Quero indicar clientes e receber comissão"
        />
        <OpcaoPerfil
          ativo={perfil === "empresa"}
          onClick={() => setPerfil("empresa")}
          titulo="Sou empresa"
          descricao="Quero publicar campanhas e receber indicações"
        />
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="perfil" value={perfil} />

        <div>
          <label className="text-sm text-muted block mb-1.5" htmlFor="nomeCompleto">
            Nome completo
          </label>
          <input
            id="nomeCompleto"
            type="text"
            name="nomeCompleto"
            required
            autoComplete="name"
            placeholder="Como está no seu documento"
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
          />
          {perfil === "parceiro" && (
            <p className="text-xs text-muted mt-1.5">
              Se você for atuar em campanha regulada, este nome precisa coincidir com o do seu
              registro profissional — divergência reprova a habilitação.
            </p>
          )}
        </div>

        <div>
          <label className="text-sm text-muted block mb-1.5" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="voce@email.com"
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
          />
        </div>

        <div>
          <label className="text-sm text-muted block mb-1.5" htmlFor="cpf">
            CPF
          </label>
          <input
            id="cpf"
            type="text"
            name="cpf"
            required
            inputMode="numeric"
            placeholder="000.000.000-00"
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
          />
          <p className="text-xs text-muted mt-1.5">
            {perfil === "empresa"
              ? "CPF do representante legal. Guardamos apenas um hash — o número nunca é gravado."
              : "Guardamos apenas um hash do CPF — o número nunca é gravado."}
          </p>
        </div>

        <div>
          <label className="text-sm text-muted block mb-1.5" htmlFor="senha">
            Senha
          </label>
          <input
            id="senha"
            type="password"
            name="senha"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Ao menos 8 caracteres"
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
          disabled={pending || !!state?.redirectTo}
          className="w-full py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold-soft transition-colors disabled:opacity-60 cursor-pointer"
        >
          {pending || state?.redirectTo ? "Criando conta..." : "Criar conta"}
        </button>

        <p className="text-xs text-muted text-center">
          Ao criar a conta você aceita os{" "}
          <Link href={perfil === "empresa" ? "/termos/empresa" : "/termos/parceiro"} className="text-gold-soft hover:text-gold">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link href="/termos/privacidade" className="text-gold-soft hover:text-gold">
            Política de Privacidade
          </Link>
          . O aceite é registrado com data, hora, IP e o texto integral congelado.
        </p>
      </form>
    </>
  );
}

function OpcaoPerfil({
  ativo,
  onClick,
  titulo,
  descricao,
}: {
  ativo: boolean;
  onClick: () => void;
  titulo: string;
  descricao: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`text-left rounded-lg border p-4 transition-colors cursor-pointer ${
        ativo ? "border-gold/60 bg-gold/5" : "border-border bg-surface hover:border-border"
      }`}
    >
      <p className={`text-sm font-medium ${ativo ? "text-gold-soft" : ""}`}>{titulo}</p>
      <p className="text-xs text-muted mt-1">{descricao}</p>
    </button>
  );
}

export default function CadastroPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold mb-2">Criar conta</h1>
      <p className="text-muted text-sm mb-8">
        Uma conta só. O que ela vira — parceiro ou empresa — é decidido no passo seguinte, e
        você pode ter os dois.
      </p>
      <Suspense fallback={null}>
        <CadastroForm />
      </Suspense>
      <p className="text-sm text-muted mt-8 text-center">
        Já tem conta?{" "}
        <Link href="/entrar" className="text-gold-soft hover:text-gold">
          Entrar
        </Link>
      </p>
    </div>
  );
}
