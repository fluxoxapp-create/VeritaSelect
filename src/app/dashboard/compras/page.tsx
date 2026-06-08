import Image from "next/image";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { coverImage } from "@/lib/cover-image";
import { getBuyerPurchases } from "@/lib/data/dashboard";

export default async function ComprasPage() {
  const purchases = await getBuyerPurchases();

  if (!purchases) {
    return (
      <DashboardShell title="Minhas compras" description="Entre para ver seu histórico de pagamentos.">
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-muted text-sm mb-4">Você precisa entrar para ver suas compras.</p>
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
      title="Minhas compras"
      description="Histórico completo de pagamentos e confirmações via Pix."
    >
      {purchases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">
          Você ainda não fez nenhuma compra.{" "}
          <Link href="/sorteios" className="text-gold-soft hover:text-gold">
            Ver seleções ativas →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-medium px-5 py-3">Seleção</th>
                <th className="text-left font-medium px-5 py-3">Data</th>
                <th className="text-left font-medium px-5 py-3">Acessos</th>
                <th className="text-left font-medium px-5 py-3">Total</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase) => (
                <tr key={purchase.id} className="border-t border-border">
                  <td className="px-5 py-4 flex items-center gap-3">
                    {purchase.raffle && (
                      <span className="relative h-9 w-9 shrink-0 rounded-md overflow-hidden bg-surface-2">
                        <Image
                          src={coverImage(purchase.raffle)}
                          alt=""
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      </span>
                    )}
                    {purchase.raffle?.title ?? "Seleção removida"}
                  </td>
                  <td className="px-5 py-4 text-muted">
                    {new Date(purchase.date).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-5 py-4 text-muted">{purchase.qty}</td>
                  <td className="px-5 py-4">
                    {purchase.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-xs px-3 py-1 rounded-full border ${
                        purchase.status === "Confirmado"
                          ? "border-gold/40 text-gold-soft"
                          : "border-border text-muted"
                      }`}
                    >
                      {purchase.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}
