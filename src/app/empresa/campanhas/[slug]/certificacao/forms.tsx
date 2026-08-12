"use client";

import { useActionState, useState } from "react";
import { salvarMaterial, adicionarQuestao, desativarQuestao } from "./actions";

const INPUT =
  "w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-gold/50";

export function MaterialForm({
  slug,
  materialUrl,
  exigeCertificacao,
}: {
  slug: string;
  materialUrl: string | null;
  exigeCertificacao: boolean;
}) {
  const [state, action, pending] = useActionState(salvarMaterial, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          name="exigeCertificacao"
          defaultChecked={exigeCertificacao}
          className="mt-1 accent-[var(--gold)]"
        />
        <span className="text-sm">
          Exigir certificação de produto nesta campanha
          <span className="block text-xs text-muted mt-1">
            O parceiro revisa o material e responde ao questionário antes de indicar. Sem prazo e
            sem limite de tentativas — a certificação qualifica o produto, não avalia a pessoa.
          </span>
        </span>
      </label>

      <div>
        <label htmlFor="materialUrl" className="text-sm font-medium block mb-1.5">
          Link do material
        </label>
        <input
          id="materialUrl"
          name="materialUrl"
          type="url"
          defaultValue={materialUrl ?? ""}
          placeholder="https://youtube.com/watch?v=... (vídeo não listado) ou link do PDF"
          className={INPUT}
        />
        <p className="text-xs text-muted mt-1.5">
          O conteúdo fica hospedado com você — vídeo não listado, PDF em drive próprio. A
          plataforma não guarda o material para não responder editorialmente pelo que a campanha
          afirma do seu produto.
        </p>
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

export function NovaQuestaoForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(adicionarQuestao, undefined);
  const [correta, setCorreta] = useState("0");
  const [n, setN] = useState(3);

  return (
    <form action={action} className="space-y-4" key={state?.ok ?? "form"}>
      <input type="hidden" name="slug" value={slug} />

      <div>
        <label htmlFor="enunciado" className="text-sm font-medium block mb-1.5">
          Pergunta
        </label>
        <textarea
          id="enunciado"
          name="enunciado"
          rows={2}
          minLength={10}
          required
          placeholder="Ex.: Qual problema o produto resolve para o cliente?"
          className={INPUT}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Alternativas — marque a correta</p>
        {Array.from({ length: n }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <input
              type="radio"
              name="correta"
              value={String(i)}
              checked={correta === String(i)}
              onChange={(e) => setCorreta(e.target.value)}
              className="accent-[var(--gold)] shrink-0"
              aria-label={`Alternativa ${i + 1} é a correta`}
            />
            <input
              name={`alternativa_${i}`}
              required={i < 2}
              placeholder={`Alternativa ${i + 1}${i < 2 ? "" : " (opcional)"}`}
              className={INPUT}
            />
          </div>
        ))}
        {n < 5 && (
          <button
            type="button"
            onClick={() => setN((v) => v + 1)}
            className="text-xs text-muted hover:text-foreground cursor-pointer"
          >
            + adicionar alternativa
          </button>
        )}
      </div>

      {state?.error && <p className="text-sm text-erro">{state.error}</p>}
      {state?.ok && <p className="text-sm text-ok">{state.ok}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gold text-background text-sm font-medium px-4 py-2 hover:bg-gold-soft transition-colors disabled:opacity-50 cursor-pointer"
      >
        {pending ? "Salvando..." : "Adicionar questão"}
      </button>
    </form>
  );
}

export function RemoverQuestaoForm({ slug, questaoId }: { slug: string; questaoId: string }) {
  const [state, action, pending] = useActionState(desativarQuestao, undefined);

  return (
    <form action={action}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="questaoId" value={questaoId} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs text-muted hover:text-erro transition-colors cursor-pointer disabled:opacity-50"
      >
        {pending ? "removendo..." : "remover"}
      </button>
      {state?.error && <p className="text-xs text-erro mt-1">{state.error}</p>}
    </form>
  );
}
