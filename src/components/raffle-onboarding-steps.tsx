import Link from "next/link";
import { submitRaffleForReview } from "@/app/organizador/sorteios/actions";

type Props = {
  raffleId: string;
  currentStep: 2 | 3;
  hasPrizes: boolean;
  hasPhotos: boolean;
  raffleStatus: string;
};

export function RaffleOnboardingSteps({
  raffleId,
  currentStep,
  hasPrizes,
  hasPhotos,
  raffleStatus,
}: Props) {
  if (raffleStatus !== "draft") return null;

  const steps = [
    { n: 1, label: "Dados básicos", done: true, href: null },
    {
      n: 2,
      label: "Prêmios",
      done: hasPrizes,
      href: `/organizador/sorteios/${raffleId}/premios`,
    },
    {
      n: 3,
      label: "Fotos & Mídia",
      done: hasPhotos,
      href: `/organizador/sorteios/${raffleId}/midia`,
    },
    { n: 4, label: "Enviar para análise", done: false, href: null },
  ];

  const allContentDone = hasPrizes && hasPhotos;

  return (
    <div className="mb-8 rounded-xl border border-border bg-surface overflow-hidden">
      {/* Steps bar */}
      <div className="flex items-stretch divide-x divide-border overflow-x-auto">
        {steps.map((step) => {
          const isCurrent = step.n === currentStep;
          const isNext =
            (currentStep === 2 && step.n === 3) ||
            (currentStep === 3 && step.n === 4);

          const base =
            "flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap transition-colors shrink-0";
          const cls = isCurrent
            ? `${base} bg-gold/8 text-gold-soft font-medium`
            : step.done
              ? `${base} text-emerald-300`
              : isNext
                ? `${base} text-foreground`
                : `${base} text-muted`;

          const badge = (
            <span
              className={`w-5 h-5 rounded-full border text-xs flex items-center justify-center font-semibold shrink-0 ${
                step.done
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                  : isCurrent
                    ? "border-gold/60 bg-gold/10 text-gold-soft"
                    : "border-border text-muted"
              }`}
            >
              {step.done ? "✓" : step.n}
            </span>
          );

          const label =
            !isCurrent && step.href ? (
              <Link href={step.href} className="hover:underline underline-offset-2">
                {step.label}
              </Link>
            ) : (
              <span>{step.label}</span>
            );

          return (
            <div key={step.n} className={cls}>
              {badge}
              {label}
            </div>
          );
        })}
      </div>

      {/* Action footer */}
      <div className="border-t border-border px-5 py-3 flex flex-wrap items-center justify-between gap-3 bg-surface-2/50">
        {currentStep === 2 ? (
          <>
            <p className="text-xs text-muted">
              {hasPrizes
                ? "Prêmios instantâneos cadastrados. Próximo passo: adicionar fotos e vídeos."
                : "Prêmios instantâneos são opcionais. Avance para fotos e mídia quando estiver pronto."}
            </p>
            <Link
              href={`/organizador/sorteios/${raffleId}/midia`}
              className="px-4 py-2 rounded-md border border-gold/40 text-gold-soft text-sm font-medium hover:bg-gold/10 transition-colors"
            >
              Próximo: Fotos &amp; Mídia →
            </Link>
          </>
        ) : (
          <>
            <p className="text-xs text-muted">
              {allContentDone
                ? "Tudo pronto — envie para análise da equipe VeritaSelect. Revisão em até 24h."
                : "Adicione pelo menos uma foto do produto antes de enviar para análise."}
            </p>
            <form action={submitRaffleForReview}>
              <input type="hidden" name="raffleId" value={raffleId} />
              <button
                type="submit"
                disabled={!allContentDone}
                className="px-4 py-2 rounded-md bg-gold text-background text-sm font-semibold hover:bg-gold-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Enviar para análise
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
