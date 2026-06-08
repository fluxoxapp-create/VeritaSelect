import Image from "next/image";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { coverImage } from "@/lib/cover-image";
import type { CoverCategory } from "@/lib/cover-image";
import { approveRaffle } from "./actions";
import { RejectForm } from "./reject-form";

type PendingRaffle = {
  id: string;
  slug: string;
  title: string;
  category: CoverCategory;
  description: string;
  cota_price_cents: number;
  total_cotas: number;
  draw_date: string;
  created_at: string;
  organizers: { display_name: string | null; is_verified: boolean | null } | { display_name: string | null; is_verified: boolean | null }[] | null;
};

function organizer(row: PendingRaffle["organizers"]) {
  if (!row) return null;
  return Array.isArray(row) ? (row[0] ?? null) : row;
}

export default async function AdminSelecoesPage() {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("raffles")
    .select(
      "id, slug, title, category, description, cota_price_cents, total_cotas, draw_date, created_at, organizers(display_name, is_verified)",
    )
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as unknown as PendingRaffle[];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Seleções aguardando validação</h1>
          <p className="text-muted text-sm mt-1">
            Confira os detalhes do prêmio antes de publicar — a aprovação torna a seleção visível ao público.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-muted hover:text-foreground transition-colors">
          ← Painel
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">
          Nenhuma seleção aguardando validação no momento.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const owner = organizer(row.organizers);
            return (
              <div key={row.id} className="rounded-xl border border-border bg-surface p-5 flex gap-5">
                <span className="relative h-24 w-24 shrink-0 rounded-lg overflow-hidden bg-surface-2">
                  <Image src={coverImage(row)} alt="" fill sizes="96px" className="object-cover" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{row.title}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {row.category} · por {owner?.display_name ?? "—"}
                        {owner?.is_verified ? (
                          <span className="ml-1.5 text-emerald-300">✓ verificado</span>
                        ) : null}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted shrink-0">
                      <p>
                        {row.total_cotas.toLocaleString("pt-BR")} acessos ·{" "}
                        {(row.cota_price_cents / 100).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </p>
                      <p className="mt-0.5">Apuração: {new Date(row.draw_date).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted mt-3 line-clamp-3">{row.description}</p>
                  <div className="flex items-center gap-2 mt-4">
                    <form action={approveRaffle}>
                      <input type="hidden" name="raffleId" value={row.id} />
                      <button
                        type="submit"
                        className="text-xs px-3 py-1.5 rounded-md border border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10 transition-colors"
                      >
                        Aprovar e publicar
                      </button>
                    </form>
                    <RejectForm raffleId={row.id} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
