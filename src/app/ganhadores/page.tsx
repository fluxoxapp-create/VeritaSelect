import Image from "next/image";
import { coverImage } from "@/lib/cover-image";
import { getWinners } from "@/lib/data/winners";

export default async function GanhadoresPage() {
  const winners = await getWinners(50);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold">Ganhadores</h1>
        <p className="text-muted mt-2 max-w-2xl">
          Cada apuração é pública, auditável e baseada no resultado oficial da
          Loteria Federal. Veja quem já recebeu seu prêmio pela VeritaSelect.
        </p>
      </div>

      {winners.length === 0 ? (
        <p className="text-sm text-muted border border-dashed border-border rounded-xl p-12 text-center">
          As primeiras apurações ainda não aconteceram — assim que houver um
          ganhador, o resultado auditável aparece aqui.
        </p>
      ) : (
        <div className="space-y-4">
          {winners.map((winner) => (
            <div
              key={`${winner.raffleSlug}-${winner.number}`}
              className="rounded-xl border border-border bg-surface p-6 flex items-center gap-6"
            >
              <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-surface-2">
                <Image
                  src={coverImage({ slug: winner.raffleSlug, category: winner.raffleCategory })}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{winner.name}</p>
                <p className="text-sm text-muted">
                  ganhou <span className="text-foreground">{winner.prize}</span>
                </p>
              </div>
              <div className="text-right text-sm text-muted">
                <p>Número sorteado</p>
                <p className="text-gold-soft font-mono text-base">{winner.number}</p>
                <p className="mt-1">{new Date(winner.drawnAt).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
