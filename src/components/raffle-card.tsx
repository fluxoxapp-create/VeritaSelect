import Image from "next/image";
import Link from "next/link";
import { coverImage } from "@/lib/cover-image";
import { progress, type Raffle } from "@/lib/data/raffles";

export function RaffleCard({ raffle }: { raffle: Raffle }) {
  const pct = progress(raffle);

  return (
    <Link
      href={`/sorteio/${raffle.slug}`}
      className="group block rounded-xl border border-border bg-surface overflow-hidden hover:border-gold/60 transition-colors"
    >
      <div className="relative h-44 bg-surface-2">
        <Image
          src={coverImage(raffle)}
          alt={raffle.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          className="object-cover"
        />
      </div>
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="uppercase tracking-wide">{raffle.category}</span>
          {raffle.organizerVerified && (
            <span className="flex items-center gap-1 text-gold-soft">
              ✓ Organizador verificado
            </span>
          )}
        </div>
        <h3 className="text-lg font-semibold group-hover:text-gold-soft transition-colors">
          {raffle.title}
        </h3>
        <p className="text-sm text-muted">por {raffle.organizer}</p>

        <div>
          <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 text-xs text-muted">
            <span>{pct}% dos acessos garantidos</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-sm text-muted">Acesso a partir de</span>
          <span className="text-lg font-semibold text-gold-soft">
            {raffle.cotaPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
      </div>
    </Link>
  );
}
