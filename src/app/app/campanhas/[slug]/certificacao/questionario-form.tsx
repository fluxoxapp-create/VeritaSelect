"use client";

import { useActionState } from "react";
import { enviarQuestionario } from "./actions";

export type QuestaoView = {
  id: string;
  enunciado: string;
  alternativas: { id: string; texto: string }[];
};

/**
 * O gabarito nunca chega aqui: `certificacao_alternativas.correta` não é
 * concedida ao papel `authenticated` (migration 0023 §4), e a correção roda
 * na server action. Este componente só recebe id e texto.
 */
export function QuestionarioForm({
  adesaoId,
  questoes,
}: {
  adesaoId: string;
  questoes: QuestaoView[];
}) {
  const [state, action, pending] = useActionState(enviarQuestionario, undefined);
  const erradas = new Set(state?.erradas ?? []);

  if (state?.ok) {
    return (
      <div className="rounded-xl border border-ok/40 bg-ok/5 p-5">
        <p className="font-medium text-ok">{state.ok}</p>
        <a
          href="/app/indicacoes/nova"
          className="inline-flex items-center rounded-md bg-gold text-background text-sm font-medium px-4 py-2 mt-4 hover:bg-gold-soft transition-colors"
        >
          Registrar primeira indicação
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="adesaoId" value={adesaoId} />

      {questoes.map((q, i) => {
        const errou = erradas.has(q.id);
        return (
          <fieldset
            key={q.id}
            className={`rounded-xl border p-5 ${errou ? "border-espera/50 bg-espera/5" : "border-border bg-surface"}`}
          >
            <legend className="text-xs uppercase tracking-wide text-muted px-2">
              Questão {i + 1} de {questoes.length}
            </legend>
            <p className="font-medium">{q.enunciado}</p>
            {errou && (
              <p className="text-xs text-espera mt-1.5">
                Reveja esta questão no material e responda de novo.
              </p>
            )}

            <div className="mt-4 space-y-2">
              {q.alternativas.map((a) => (
                <label
                  key={a.id}
                  className="flex items-start gap-3 rounded-lg border border-border px-4 py-3 cursor-pointer hover:border-gold/40 transition-colors has-[:checked]:border-gold/60 has-[:checked]:bg-gold/5"
                >
                  <input
                    type="radio"
                    name={`q_${q.id}`}
                    value={a.id}
                    required
                    className="mt-1 accent-[var(--gold)]"
                  />
                  <span className="text-sm">{a.texto}</span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}

      {state?.error && (
        <p className="text-sm text-espera rounded-lg border border-espera/40 bg-espera/5 px-4 py-3">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gold text-background font-medium px-5 py-2.5 hover:bg-gold-soft transition-colors disabled:opacity-50 cursor-pointer"
      >
        {pending ? "Conferindo..." : "Enviar respostas"}
      </button>

      <p className="text-xs text-muted">
        Sem prazo e sem limite de tentativas. Errar não gera nenhuma consequência — o questionário
        existe para que você apresente o produto corretamente a quem indicar, não para avaliar você.
      </p>
    </form>
  );
}
