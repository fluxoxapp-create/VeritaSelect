import Image from "next/image";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { coverImage } from "@/lib/cover-image";
import { getBuyerNumbers } from "@/lib/data/dashboard";

export default async function NumerosPage() {
  const groups = await getBuyerNumbers();

  if (!groups) {
    return (
      <DashboardShell title="Meus números" description="Entre para ver seus números garantidos.">
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-muted text-sm mb-4">Você precisa entrar para ver seus números.</p>
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
      title="Meus números"
      description="Estes são os números vinculados aos seus acessos em cada seleção ativa."
    >
      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">
          Você ainda não tem números garantidos.{" "}
          <Link href="/sorteios" className="text-gold-soft hover:text-gold">
            Ver seleções ativas →
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ raffle, numbers }) => (
            <div key={raffle.slug} className="rounded-xl border border-border bg-surface p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="relative h-11 w-11 shrink-0 rounded-md overflow-hidden bg-surface-2">
                  <Image src={coverImage(raffle)} alt="" fill sizes="44px" className="object-cover" />
                </span>
                <div>
                  <p className="font-medium">{raffle.title}</p>
                  <p className="text-xs text-muted">
                    Apuração em {new Date(raffle.drawDate).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {numbers.map((number) => (
                  <span
                    key={number}
                    className="font-mono text-sm px-3 py-1.5 rounded-md border border-border text-muted"
                  >
                    {number}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
