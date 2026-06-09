import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { coverImage } from "@/lib/cover-image";
import { getRaffleBySlug, progress } from "@/lib/data/raffles";
import { CheckoutSidebar } from "./checkout-sidebar";

function getMilestoneVideo(raffle: {
  soldCotas: number; totalCotas: number;
  videoPresentation: string | null; video25: string | null;
  video50: string | null; video75: string | null; video100: string | null;
}): string | null {
  const pct = raffle.totalCotas > 0 ? (raffle.soldCotas / raffle.totalCotas) * 100 : 0;
  if (pct >= 100 && raffle.video100) return raffle.video100;
  if (pct >= 75 && raffle.video75) return raffle.video75;
  if (pct >= 50 && raffle.video50) return raffle.video50;
  if (pct >= 25 && raffle.video25) return raffle.video25;
  return raffle.videoPresentation;
}

export default async function RafflePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const raffle = await getRaffleBySlug(slug);
  if (!raffle) notFound();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const hasPhotos = raffle.photoPaths.length > 0;
  const activeVideo = getMilestoneVideo(raffle);
  const pct = progress(raffle);

  function photoUrl(path: string) {
    return `${supabaseUrl}/storage/v1/object/public/raffle-photos/${path}`;
  }

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

          {/* Galeria de fotos */}
          {hasPhotos ? (
            <div className="space-y-3">
              <div className="relative rounded-xl border border-border overflow-hidden h-72 sm:h-96 bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl(raffle.photoPaths[0])}
                  alt={raffle.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {raffle.photoPaths.length > 1 && (
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  {raffle.photoPaths.slice(1, 5).map((path, i) => (
                    <div
                      key={path}
                      className={`relative h-14 sm:h-20 rounded-lg border overflow-hidden bg-surface ${
                        i === 0 ? "border-gold/60" : "border-border opacity-80"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoUrl(path)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Fallback: cover image gerada */
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
          )}

          {/* Vídeo do marco atual */}
          {activeVideo && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">Vídeo da seleção</p>
                <span className="text-xs text-muted border border-border rounded-full px-2 py-0.5">
                  {pct >= 100 ? "Encerrada" : pct >= 75 ? "75%+" : pct >= 50 ? "50%+" : pct >= 25 ? "25%+" : "Apresentação"}
                </span>
              </div>
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                <iframe
                  src={`${activeVideo}?rel=0&modestbranding=1`}
                  title="Vídeo da seleção"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
          )}

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
          <CheckoutSidebar
            slug={raffle.slug}
            cotaPrice={raffle.cotaPrice}
            soldCotas={raffle.soldCotas}
            totalCotas={raffle.totalCotas}
          />
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
