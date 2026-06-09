import Image from "next/image";
import Link from "next/link";
import { OrganizerShell } from "@/components/organizer-shell";
import { coverImage } from "@/lib/cover-image";
import { progress } from "@/lib/data/raffles";
import { getOrganizerRaffles } from "@/lib/data/organizer";
import { submitRaffleForReview } from "./actions";

export default async function MinhasSelecoesPage() {
  const raffles = await getOrganizerRaffles();

  if (!raffles) {
    return (
      <OrganizerShell title="Minhas seleções" description="Entre como organizador para ver suas campanhas.">
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-muted text-sm mb-4">Você precisa entrar para ver suas seleções.</p>
          <Link
            href="/entrar"
            className="inline-block px-6 py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold-soft transition-colors"
          >
            Entrar
          </Link>
        </div>
      </OrganizerShell>
    );
  }

  return (
    <OrganizerShell
      title="Minhas seleções"
      description="Status, vendas e datas de apuração das suas campanhas publicadas."
    >
      <div className="mb-6">
        <Link
          href="/organizador/sorteios/novo"
          className="inline-block px-5 py-2.5 rounded-md bg-gold text-background text-sm font-medium hover:bg-gold-soft transition-colors"
        >
          + Nova seleção
        </Link>
      </div>
      {raffles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">
          Você ainda não tem nenhuma seleção cadastrada.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-medium px-5 py-3">Seleção</th>
                <th className="text-left font-medium px-5 py-3">Acessos vendidos</th>
                <th className="text-left font-medium px-5 py-3">Apuração</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
                <th className="text-left font-medium px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {raffles.map((raffle) => (
                <tr key={raffle.slug} className="border-t border-border">
                  <td className="px-5 py-4 flex items-center gap-3">
                    <span className="relative h-9 w-9 shrink-0 rounded-md overflow-hidden bg-surface-2">
                      <Image src={coverImage(raffle)} alt="" fill sizes="36px" className="object-cover" />
                    </span>
                    {raffle.title}
                  </td>
                  <td className="px-5 py-4 text-muted">
                    {progress(raffle)}% · {raffle.soldCotas.toLocaleString("pt-BR")} /{" "}
                    {raffle.totalCotas.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-5 py-4 text-muted">
                    {new Date(raffle.drawDate).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-xs px-3 py-1 rounded-full border ${
                        raffle.status === "published"
                          ? "border-gold/40 text-gold-soft"
                          : "border-border text-muted"
                      }`}
                    >
                      {raffle.statusLabel}
                    </span>
                    {raffle.status === "draft" && raffle.rejectionReason && (
                      <p className="text-xs text-red-300/80 mt-1.5 max-w-xs">
                        Reprovada: {raffle.rejectionReason}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {raffle.status === "draft" && (
                        <Link
                          href={`/organizador/sorteios/${raffle.id}/premios`}
                          className="text-xs px-3 py-1.5 rounded-md border border-border text-muted hover:border-gold/40 hover:text-foreground transition-colors"
                        >
                          Prêmios
                        </Link>
                      )}
                      {raffle.status === "draft" && (
                        <form action={submitRaffleForReview}>
                          <input type="hidden" name="raffleId" value={raffle.id} />
                          <button
                            type="submit"
                            className="text-xs px-3 py-1.5 rounded-md border border-gold/40 text-gold-soft hover:bg-gold/10 transition-colors"
                          >
                            Enviar para análise
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </OrganizerShell>
  );
}
