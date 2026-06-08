import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { coverImage } from "@/lib/cover-image";
import { getRaffleBySlug, progress } from "@/lib/data/raffles";

export default async function RafflePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const raffle = await getRaffleBySlug(slug);
  if (!raffle) notFound();

  const pct = progress(raffle);
  const cotaOptions = [5, 10, 25, 50];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10 pb-28 lg:pb-10">
      <nav className="flex items-center gap-2 text-sm text-muted mb-6">
        <Link href="/sorteios" className="hover:text-foreground transition-colors">
          Sorteios
        </Link>
        <span>/</span>
        <span className="text-foreground truncate">{raffle.title}</span>
      </nav>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          {/* Galeria */}
          <div className="space-y-3">
            <div className="relative rounded-xl border border-border overflow-hidden h-72 sm:h-96 bg-surface-2">
              <Image
                src={coverImage(raffle, 0)}
                alt={raffle.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-cover"
              />
            </div>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`relative h-14 sm:h-20 rounded-lg border overflow-hidden bg-surface ${
                    i === 0 ? "border-gold/60" : "border-border opacity-60"
                  }`}
                >
                  <Image
                    src={coverImage(raffle, i + 1)}
                    alt=""
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Cabeçalho */}
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide mb-3">
              <span className="px-2.5 py-1 rounded-full border border-border text-muted">
                {raffle.category}
              </span>
              <span className="px-2.5 py-1 rounded-full border border-gold/40 text-gold-soft flex items-center gap-1">
                ✓ Organizador verificado
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">{raffle.title}</h1>
            <p className="text-muted mt-3 max-w-2xl leading-relaxed">{raffle.description}</p>
          </div>

          {/* Transparência */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <span className="text-gold-soft">◆</span> Transparência
            </h2>
            <ul className="text-sm text-muted space-y-3">
              <li className="flex gap-3">
                <span className="text-gold-soft shrink-0">✓</span>
                Apuração pelo resultado da Loteria Federal, regra fixa e pública.
              </li>
              <li className="flex gap-3">
                <span className="text-gold-soft shrink-0">✓</span>
                <span>
                  Data prevista da apuração:{" "}
                  <span className="text-foreground font-medium">
                    {new Date(raffle.drawDate).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-gold-soft shrink-0">✓</span>
                Documentação do prêmio validada pela equipe VeritaSelect antes da publicação.
              </li>
              <li className="flex gap-3">
                <span className="text-gold-soft shrink-0">✓</span>
                Histórico completo do organizador disponível no perfil.
              </li>
            </ul>
          </div>

          {/* Organizador */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="font-semibold mb-4">Organizador</h2>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-12 w-12 shrink-0 rounded-full bg-surface-2 border border-border flex items-center justify-center text-xl">
                  {raffle.organizer.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{raffle.organizer}</p>
                  <p className="text-sm text-gold-soft flex items-center gap-1">
                    ✓ Verificado · documentos validados
                  </p>
                </div>
              </div>
              <span className="text-sm text-muted whitespace-nowrap">★ 4.9 reputação</span>
            </div>
          </div>
        </div>

        {/* Checkout */}
        <aside>
          <div className="rounded-xl border border-border bg-surface p-6 space-y-5 lg:sticky lg:top-24">
            <div>
              <p className="text-sm text-muted">Acesso a partir de</p>
              <p className="text-3xl font-semibold text-gold-soft">
                {raffle.cotaPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>

            <div>
              <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-gold-soft to-gold rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted">{pct}% dos acessos garantidos</p>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Quantidade de acessos</p>
              <div className="grid grid-cols-4 gap-2">
                {cotaOptions.map((qty, i) => (
                  <button
                    key={qty}
                    type="button"
                    className={`text-sm text-center py-2 rounded-md border transition-colors cursor-pointer ${
                      i === 1
                        ? "border-gold bg-gold/10 text-gold-soft"
                        : "border-border text-muted hover:border-gold/40 hover:text-foreground"
                    }`}
                  >
                    {qty}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <button
                type="button"
                className="px-3 py-2 rounded-md border border-gold/60 bg-gold/10 text-gold-soft text-center cursor-pointer"
              >
                Números aleatórios
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-md border border-border text-muted hover:border-gold/40 hover:text-foreground transition-colors text-center cursor-pointer"
              >
                Escolher manualmente
              </button>
            </div>

            <Link
              href={`/sorteio/${raffle.slug}/comprar`}
              className="block w-full py-3.5 rounded-md bg-gold text-background font-semibold text-center hover:bg-gold-soft transition-colors shadow-lg shadow-gold/10"
            >
              Comprar com Pix
            </Link>
            <div className="flex items-center justify-center gap-4 text-xs text-muted">
              <span className="flex items-center gap-1">🔒 Pagamento protegido</span>
              <span className="flex items-center gap-1">⚡ Confirmação em segundos</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Barra fixa mobile */}
      <div className="fixed bottom-0 inset-x-0 lg:hidden border-t border-border bg-background/95 backdrop-blur px-4 sm:px-6 py-4 flex items-center justify-between gap-4 z-40">
        <div>
          <p className="text-xs text-muted">Acesso a partir de</p>
          <p className="text-lg font-semibold text-gold-soft">
            {raffle.cotaPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
        <Link
          href={`/sorteio/${raffle.slug}/comprar`}
          className="px-6 py-3 rounded-md bg-gold text-background font-semibold hover:bg-gold-soft transition-colors"
        >
          Comprar com Pix
        </Link>
      </div>
    </div>
  );
}
