import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getRaffleBySlug, progress } from "@/lib/data/raffles";
import { coverImage } from "@/lib/cover-image";
import { CheckoutForm } from "@/app/sorteio/[slug]/comprar/checkout-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const raffle = await getRaffleBySlug(slug);
  if (!raffle) return { title: "Seleção não encontrada" };

  const price = raffle.cotaPrice.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const pct = progress(raffle);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const ogImage =
    raffle.photoPaths.length > 0
      ? `${supabaseUrl}/storage/v1/object/public/raffle-photos/${raffle.photoPaths[0]}`
      : undefined;

  return {
    title: `${raffle.title} — VeritaSelect`,
    description: `Acesso a partir de ${price} · ${pct}% garantidos · Organizado por ${raffle.organizer} · Apuração pela Loteria Federal.`,
    openGraph: {
      title: raffle.title,
      description: `Acesse por ${price} · ${pct}% garantidos · Organizado por ${raffle.organizer}`,
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: raffle.title }] } : {}),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: raffle.title,
      description: `Acesse por ${price} · Apuração pela Loteria Federal.`,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function RaffleLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const raffle = await getRaffleBySlug(slug);
  if (!raffle) notFound();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const hasPhotos = raffle.photoPaths.length > 0;
  const pct = progress(raffle);
  const remaining = Math.max(0, raffle.totalCotas - raffle.soldCotas);
  const isSoldOut = remaining <= 0;

  function photoUrl(path: string) {
    return `${supabaseUrl}/storage/v1/object/public/raffle-photos/${path}`;
  }

  const heroSrc = hasPhotos ? photoUrl(raffle.photoPaths[0]) : null;
  const coverSrc = !hasPhotos ? coverImage(raffle) : null;

  const drawDateFmt = new Date(raffle.drawDate).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      {/* ── Hero ── */}
      <section className="relative w-full h-[56vw] min-h-[280px] max-h-[600px] overflow-hidden bg-surface-2">
        {heroSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroSrc} alt={raffle.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : coverSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverSrc} alt={raffle.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : null}
        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        {/* Title overlay */}
        <div className="absolute bottom-0 inset-x-0 px-4 sm:px-8 pb-6 sm:pb-10">
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full border border-border text-muted bg-background/80 backdrop-blur-sm">
                {raffle.category}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full border border-gold/40 text-gold-soft bg-background/80 backdrop-blur-sm">
                ✓ Organizado verificado
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-semibold leading-tight drop-shadow-lg">
              {raffle.title}
            </h1>
          </div>
        </div>
      </section>

      {/* Thumbnail strip */}
      {raffle.photoPaths.length > 1 && (
        <div className="mx-auto max-w-4xl px-4 sm:px-8 -mt-2 mb-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {raffle.photoPaths.slice(1, 7).map((path) => (
              <div key={path} className="shrink-0 h-14 w-20 rounded-lg border border-border overflow-hidden bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl(path)} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="mx-auto max-w-4xl px-4 sm:px-8 py-8 grid lg:grid-cols-5 gap-10">

        {/* Left: info */}
        <div className="lg:col-span-3 space-y-8">

          {/* Progress */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{pct}% garantidos</span>
              <span className="text-muted">
                {raffle.soldCotas.toLocaleString("pt-BR")} de {raffle.totalCotas.toLocaleString("pt-BR")} acessos
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-surface-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-soft to-gold transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 pt-1">
              {[
                { label: "Acesso a partir de", value: raffle.cotaPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
                { label: "Apuração", value: drawDateFmt },
                { label: "Organizador", value: raffle.organizer },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-muted">{item.label}</p>
                  <p className="text-sm font-medium mt-0.5 truncate">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <h2 className="font-semibold mb-3">Sobre o prêmio</h2>
            <p className="text-muted leading-relaxed text-sm whitespace-pre-line">{raffle.description}</p>
          </div>

          {/* Transparency */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <span className="text-gold-soft">◆</span> Transparência e segurança
            </h2>
            <ul className="text-sm text-muted space-y-2.5">
              {[
                "Apuração pelo resultado da Loteria Federal — regra fixa e auditável.",
                `Data de apuração: ${drawDateFmt}.`,
                "Documentação do prêmio validada pela equipe VeritaSelect antes da publicação.",
                "Organizador verificado com documentos validados.",
                "Estorno automático em caso de cancelamento por meta não atingida.",
              ].map((line) => (
                <li key={line} className="flex gap-2.5">
                  <span className="text-gold-soft shrink-0 mt-0.5">✓</span>
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {/* Organizer */}
          <div className="rounded-xl border border-border bg-surface p-5 flex items-center gap-4">
            <div className="h-12 w-12 shrink-0 rounded-full bg-surface-2 border border-border flex items-center justify-center text-xl font-medium">
              {raffle.organizer.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-medium">{raffle.organizer}</p>
              <p className="text-sm text-gold-soft">✓ Verificado · documentos validados</p>
            </div>
            <Link
              href={`/sorteio/${raffle.slug}`}
              className="ml-auto text-xs text-muted hover:text-foreground transition-colors whitespace-nowrap shrink-0"
            >
              Ver na plataforma →
            </Link>
          </div>
        </div>

        {/* Right: checkout */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-24 rounded-xl border border-border bg-surface p-6 space-y-5">
            <div>
              <p className="text-xs text-muted mb-0.5">Acesso a partir de</p>
              <p className="text-3xl font-semibold text-gold-soft">
                {raffle.cotaPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>

            {isSoldOut ? (
              <div className="rounded-lg border border-dashed border-border bg-surface-2 p-4 text-center text-sm text-muted">
                Todos os acessos desta seleção já foram garantidos.
              </div>
            ) : (
              <CheckoutForm
                slug={raffle.slug}
                unitPriceCents={Math.round(raffle.cotaPrice * 100)}
                maxQuantity={remaining}
              />
            )}

            <div className="pt-1 border-t border-border space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>🔒</span>
                <span>Pagamento seguro via Pix (Mercado Pago)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>⚡</span>
                <span>Confirmação automática após pagamento</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>📋</span>
                <span>Números reservados por 10 min durante o pagamento</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky footer */}
      <div className="fixed bottom-0 inset-x-0 lg:hidden border-t border-border bg-background/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-4 z-40">
        <div>
          <p className="text-xs text-muted">Acesso a partir de</p>
          <p className="text-base font-semibold text-gold-soft">
            {raffle.cotaPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
        <a
          href="#checkout"
          className="px-5 py-2.5 rounded-md bg-gold text-background font-semibold text-sm hover:bg-gold-soft transition-colors"
        >
          Garantir acesso
        </a>
      </div>

      {/* Footer */}
      <div className="border-t border-border/60 mt-16 py-8 text-center space-y-1">
        <p className="text-xs text-muted">
          Seleção organizada e verificada por{" "}
          <Link href="/" className="text-gold-soft hover:underline">
            VeritaSelect
          </Link>
        </p>
        <p className="text-xs text-muted/60">
          <Link href="/termos" className="hover:text-muted transition-colors">Termos</Link>
          {" · "}
          <Link href="/seguranca" className="hover:text-muted transition-colors">Segurança</Link>
          {" · "}
          <Link href={`/sorteio/${raffle.slug}`} className="hover:text-muted transition-colors">
            Ver na plataforma
          </Link>
        </p>
      </div>
    </div>
  );
}
