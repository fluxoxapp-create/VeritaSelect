import Image from "next/image";
import Link from "next/link";
import { RaffleCard } from "@/components/raffle-card";
import { coverImage } from "@/lib/cover-image";
import { getPublishedRaffles } from "@/lib/data/raffles";
import { getWinners } from "@/lib/data/winners";

export default async function Home() {
  const [raffles, winners] = await Promise.all([getPublishedRaffles(), getWinners(3)]);

  const highlights = raffles.slice(0, 3);
  const endingSoon = [...raffles]
    .sort((a, b) => a.drawDate.localeCompare(b.drawDate))
    .slice(0, 4);

  return (
    <div>
      <section className="border-b border-border bg-gradient-to-b from-surface to-background overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24 grid lg:grid-cols-2 gap-10 sm:gap-12 items-center">
          <div className="space-y-5 sm:space-y-6 min-w-0">
            <span className="inline-block text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] text-gold-soft border border-gold/40 rounded-full px-3 py-1">
              Plataforma premium · organizadores verificados
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight text-balance">
              Sorteios premium <span className="text-gradient-gold">verificados</span>.
            </h1>
            <p className="text-muted text-base sm:text-lg max-w-lg">
              Caminhonetes, máquinas agrícolas, motos e barcos de organizadores
              auditados pela nossa equipe. Qualquer pessoa participa — só os
              mais confiáveis anunciam.
            </p>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <Link
                href="/sorteios"
                className="px-6 py-3 rounded-md bg-gold text-background font-medium hover:bg-gold-soft transition-colors"
              >
                Ver sorteios
              </Link>
              <Link
                href="/como-funciona"
                className="px-6 py-3 rounded-md border border-border hover:border-gold/60 transition-colors"
              >
                Como funciona
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-4 text-sm text-muted">
              <div>
                <p className="text-2xl font-semibold text-foreground">100%</p>
                <p>organizadores com KYC</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">+30 mil</p>
                <p>cotas vendidas</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">Loteria Federal</p>
                <p>apuração oficial</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 min-w-0">
            {highlights.length === 0 && (
              <div className="col-span-2 rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
                Em breve, novas seleções premium por aqui.
              </div>
            )}
            {highlights.map((raffle, i) => (
              <div
                key={raffle.slug}
                className={`rounded-xl border border-border bg-surface overflow-hidden flex ${
                  i === 0 ? "col-span-2 flex-row" : "flex-col"
                }`}
              >
                <div className={`relative bg-surface-2 ${i === 0 ? "w-28 sm:w-48 shrink-0" : "h-28 w-full"}`}>
                  <Image
                    src={coverImage(raffle)}
                    alt={raffle.title}
                    fill
                    sizes="240px"
                    className="object-cover"
                  />
                </div>
                <div className="p-3 sm:p-4 flex flex-col justify-center min-w-0">
                  <p className="font-semibold text-sm sm:text-base truncate">{raffle.title}</p>
                  <p className="text-xs text-muted truncate">{raffle.organizer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-semibold">Encerrando em breve</h2>
            <p className="text-muted text-sm mt-1">Garanta sua cota antes da apuração.</p>
          </div>
          <Link href="/sorteios" className="text-sm text-gold-soft hover:text-gold whitespace-nowrap">
            Ver todos →
          </Link>
        </div>
        {endingSoon.length === 0 ? (
          <p className="text-sm text-muted border border-dashed border-border rounded-xl p-8 text-center">
            Nenhuma seleção publicada no momento. Volte em breve.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {endingSoon.map((raffle) => (
              <RaffleCard key={raffle.slug} raffle={raffle} />
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-semibold">Últimos ganhadores</h2>
              <p className="text-muted text-sm mt-1">Resultados auditáveis, com apuração pública.</p>
            </div>
            <Link href="/ganhadores" className="text-sm text-gold-soft hover:text-gold whitespace-nowrap">
              Ver todos →
            </Link>
          </div>
          {winners.length === 0 ? (
            <p className="text-sm text-muted border border-dashed border-border rounded-xl p-8 text-center">
              As primeiras apurações acontecerão em breve — e serão publicadas aqui.
            </p>
          ) : (
            <div className="grid sm:grid-cols-3 gap-6">
              {winners.map((winner) => (
                <div key={winner.number} className="rounded-xl border border-border bg-surface p-6">
                  <p className="text-xs uppercase tracking-wide text-gold-soft mb-2">
                    Número {winner.number}
                  </p>
                  <p className="font-semibold">{winner.name}</p>
                  <p className="text-sm text-muted mt-1">ganhou {winner.prize}</p>
                  <p className="text-xs text-muted mt-3">
                    Apurado em {new Date(winner.drawnAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
