import Image from "next/image";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { coverImage } from "@/lib/cover-image";
import { getBuyerDashboard } from "@/lib/data/dashboard";

export default async function DashboardPage() {
  const summary = await getBuyerDashboard();

  if (!summary) {
    return (
      <DashboardShell title="Sua conta" description="Entre para ver seus acessos e seleções.">
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-muted text-sm mb-4">Você precisa entrar para ver seu painel.</p>
          <Link
            href="/entrar"
            className="inline-block px-6 py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold-soft transition-colors"
          >
            Entrar
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Olá, bem-vindo de volta"
      description="Acompanhe seus acessos, seleções ativas e notificações em um só lugar."
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {summary.stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-surface p-5">
            <p className="text-xs text-muted uppercase tracking-wide">{stat.label}</p>
            <p className="text-2xl font-semibold mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      <h2 className="font-semibold mb-4">Seleções em que você está participando</h2>
      {summary.activeParticipations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
          Você ainda não garantiu acessos em nenhuma seleção.{" "}
          <Link href="/sorteios" className="text-gold-soft hover:text-gold">
            Ver seleções ativas →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {summary.activeParticipations.map((raffle) => (
            <Link
              key={raffle.slug}
              href={`/sorteio/${raffle.slug}`}
              className="rounded-xl border border-border bg-surface p-5 flex items-center gap-4 hover:border-gold/60 transition-colors"
            >
              <span className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-surface-2">
                <Image src={coverImage(raffle)} alt="" fill sizes="48px" className="object-cover" />
              </span>
              <div className="flex-1">
                <p className="font-medium">{raffle.title}</p>
                <p className="text-sm text-muted">
                  {raffle.accessCount} acessos · apuração em{" "}
                  {new Date(raffle.drawDate).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <span className="text-xs text-gold-soft border border-gold/40 rounded-full px-3 py-1">
                Ativo
              </span>
            </Link>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
