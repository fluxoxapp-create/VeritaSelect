import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRaffleBySlug, progress } from "@/lib/data/raffles";
import { CheckoutForm } from "./checkout-form";

export default async function ComprarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/entrar?next=${encodeURIComponent(`/sorteio/${slug}/comprar`)}`);
  }

  const raffle = await getRaffleBySlug(slug);
  if (!raffle) notFound();

  const remaining = Math.max(0, raffle.totalCotas - raffle.soldCotas);
  const pct = progress(raffle);

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 py-10 sm:py-14">
      <nav className="flex items-center gap-2 text-sm text-muted mb-6">
        <Link href={`/sorteio/${slug}`} className="hover:text-foreground transition-colors">
          {raffle.title}
        </Link>
        <span>/</span>
        <span className="text-foreground">Comprar</span>
      </nav>

      <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold">{raffle.title}</h1>
          <p className="text-sm text-muted mt-1">
            Acesso a partir de{" "}
            <span className="text-gold-soft font-medium">
              {raffle.cotaPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </p>
          <div className="mt-3">
            <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-gold-soft to-gold rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              {pct}% dos acessos garantidos · {remaining} restantes
            </p>
          </div>
        </div>

        {remaining <= 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface-2 p-5 text-center text-sm text-muted">
            Todos os acessos desta seleção já foram garantidos.
          </div>
        ) : (
          <CheckoutForm slug={slug} unitPriceCents={Math.round(raffle.cotaPrice * 100)} maxQuantity={remaining} />
        )}

        <div className="flex items-center justify-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1">🔒 Pagamento protegido via Pix</span>
          <span className="flex items-center gap-1">⚡ Confirmação automática</span>
        </div>
      </div>
    </div>
  );
}
