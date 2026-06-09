"use client";

import { useActionState } from "react";
import { saveVideoUrls } from "./actions";

type State = { error: string | null; success?: boolean } | undefined;

const MILESTONES = [
  {
    key: "video_presentation_url",
    label: "Vídeo de apresentação",
    hint: "Exibido até 25% das cotas vendidas — apresente o produto, o organizador, a documentação.",
    badge: "0%",
    badgeColor: "text-gold-soft border-gold/40",
  },
  {
    key: "video_25_url",
    label: "Vídeo dos 25%",
    hint: "Exibido de 25% a 50% — pode mostrar o produto novamente ou dar um update.",
    badge: "25%",
    badgeColor: "text-amber-300 border-amber-400/40",
  },
  {
    key: "video_50_url",
    label: "Vídeo dos 50%",
    hint: "Exibido de 50% a 75% — boa hora para reforçar a credibilidade.",
    badge: "50%",
    badgeColor: "text-emerald-300 border-emerald-400/40",
  },
  {
    key: "video_75_url",
    label: "Vídeo dos 75%",
    hint: "Exibido de 75% a 100% — crie urgência para os últimos compradores.",
    badge: "75%",
    badgeColor: "text-blue-300 border-blue-400/40",
  },
  {
    key: "video_100_url",
    label: "Vídeo do resultado",
    hint: "Exibido quando a seleção encerrar. Pode ser o vídeo ao vivo do sorteio ou o anúncio do ganhador.",
    badge: "100%",
    badgeColor: "text-red-400 border-red-400/40",
  },
] as const;

export function VideoForm({
  raffleId,
  initialValues,
}: {
  raffleId: string;
  initialValues: Record<string, string | null>;
}) {
  const [state, action, pending] = useActionState(saveVideoUrls, undefined as State);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="raffleId" value={raffleId} />

      {MILESTONES.map((m) => (
        <div key={m.key}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${m.badgeColor}`}>
              {m.badge}
            </span>
            <label className="text-sm font-medium">{m.label}</label>
          </div>
          <input
            type="url"
            name={m.key}
            defaultValue={initialValues[m.key] ?? ""}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60 transition-colors"
          />
          <p className="text-xs text-muted mt-1">{m.hint}</p>
        </div>
      ))}

      {state?.error && (
        <p className="text-sm text-red-400 border border-red-400/20 bg-red-400/5 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded-md border border-gold/40 text-gold-soft text-sm hover:bg-gold/10 transition-colors cursor-pointer disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar vídeos"}
        </button>
        {state?.success && (
          <p className="text-sm text-emerald-400">Vídeos salvos com sucesso.</p>
        )}
      </div>
    </form>
  );
}
