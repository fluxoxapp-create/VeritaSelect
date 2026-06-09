import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OrganizerShell } from "@/components/organizer-shell";
import { PrizesForm } from "./prizes-form";
import { removePrize } from "./actions";

const LOTTERY_DIGITS: Record<number, number> = { 100: 2, 1000: 3, 10000: 4, 100000: 5 };

const REVEAL_LABEL: Record<number, string> = {
  0:   "Revelado imediatamente",
  25:  "Revela aos 25%",
  50:  "Revela aos 50%",
  75:  "Revela aos 75%",
  100: "Revela ao encerrar",
};

export default async function PremiosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: raffle } = await supabase
    .from("raffles")
    .select("id, title, total_cotas, status, draw_method")
    .eq("id", id)
    .eq("organizer_id", user.id)
    .maybeSingle();

  if (!raffle) notFound();

  const { data: prizes } = await supabase
    .from("raffle_prizes")
    .select("id, prize_number, prize_description, reveal_at_pct, is_revealed, winner_buyer_id")
    .eq("raffle_id", id)
    .order("prize_number", { ascending: true });

  const rows = prizes ?? [];
  const isDraft = raffle.status === "draft";
  const numDigits = LOTTERY_DIGITS[raffle.total_cotas] ?? 5;

  return (
    <OrganizerShell
      title={`Prêmios instantâneos — ${raffle.title}`}
      description="Números premiados são adicionais ao sorteio principal. Quem tirar um número premiado ganha o prêmio instantâneo e continua concorrendo ao prêmio principal."
    >
      {/* Info card */}
      <div className="rounded-lg border border-gold/20 bg-gold/5 px-5 py-4 text-sm text-muted mb-6 max-w-2xl space-y-1">
        <p className="font-medium text-foreground">Como funcionam os prêmios instantâneos</p>
        <p>Você escolhe números específicos dentro do total de acessos e atribui um prêmio a cada um. Quando um comprador adquire um número premiado, ele recebe o prêmio instantâneo <span className="text-foreground font-medium">e ainda continua concorrendo ao prêmio principal</span>.</p>
        <p>Você pode revelar os números premiados imediatamente ou conforme a meta de vendas for atingida (25%, 50%, 75% ou ao encerrar).</p>
      </div>

      {/* Existing prizes */}
      {rows.length > 0 && (
        <div className="rounded-xl border border-border bg-surface overflow-hidden mb-8">
          <div className="px-5 py-3 bg-surface-2 border-b border-border">
            <p className="text-sm font-medium">
              {rows.length} número{rows.length !== 1 ? "s" : ""} premiado{rows.length !== 1 ? "s" : ""} cadastrado{rows.length !== 1 ? "s" : ""}
            </p>
          </div>
          <table className="w-full text-sm">
            <thead className="text-muted text-xs uppercase tracking-wide">
              <tr className="border-b border-border">
                <th className="text-left font-medium px-5 py-3">Nº</th>
                <th className="text-left font-medium px-5 py-3">Prêmio</th>
                <th className="text-left font-medium px-5 py-3">Revelação</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
                {isDraft && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((prize) => (
                <tr key={prize.id} className="border-t border-border">
                  <td className="px-5 py-3 font-mono font-medium">
                    {String(prize.prize_number).padStart(numDigits, "0")}
                  </td>
                  <td className="px-5 py-3">{prize.prize_description}</td>
                  <td className="px-5 py-3 text-muted text-xs">
                    {REVEAL_LABEL[prize.reveal_at_pct] ?? "—"}
                  </td>
                  <td className="px-5 py-3">
                    {prize.winner_buyer_id ? (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-gold/40 text-gold-soft">Premiado!</span>
                    ) : prize.is_revealed ? (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-emerald-400/40 text-emerald-300">Revelado</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted">Oculto</span>
                    )}
                  </td>
                  {isDraft && (
                    <td className="px-5 py-3 text-right">
                      <form action={removePrize.bind(null, prize.id, raffle.id)}>
                        <button
                          type="submit"
                          className="text-xs text-muted hover:text-red-400 transition-colors cursor-pointer"
                        >
                          Remover
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add form — only for drafts */}
      {isDraft ? (
        <div className="rounded-xl border border-border bg-surface p-6 max-w-2xl">
          <h2 className="font-semibold mb-5">Adicionar número premiado</h2>
          <PrizesForm raffleId={raffle.id} totalCotas={raffle.total_cotas} />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-surface p-5 text-center text-sm text-muted max-w-2xl">
          Prêmios não podem ser alterados após a seleção ser enviada para análise.
        </div>
      )}

      <div className="mt-6">
        <Link
          href="/organizador/sorteios"
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          ← Minhas seleções
        </Link>
      </div>
    </OrganizerShell>
  );
}
