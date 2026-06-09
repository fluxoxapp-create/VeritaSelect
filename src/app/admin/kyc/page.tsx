import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const STATUS_COLOR: Record<string, string> = {
  not_submitted: "text-muted border-border",
  pending: "text-amber-300 border-amber-400/40",
  approved: "text-emerald-300 border-emerald-400/40",
  rejected: "text-red-400 border-red-400/40",
};
const STATUS_LABEL: Record<string, string> = {
  not_submitted: "Não enviado", pending: "Em análise",
  approved: "Aprovado", rejected: "Reprovado",
};

export default async function AdminKycPage() {
  const admin = createSupabaseAdminClient();

  const { data: organizers } = await admin
    .from("organizers")
    .select("id, display_name, kyc_status, kyc_submitted_at, is_verified")
    .order("kyc_submitted_at", { ascending: false, nullsFirst: false });

  const rows = organizers ?? [];
  const pendingCount = rows.filter((r) => r.kyc_status === "pending").length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Verificação KYC</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-amber-300 mt-1">
              {pendingCount} pendente{pendingCount !== 1 ? "s" : ""} aguardando análise
            </p>
          )}
        </div>
        <Link href="/admin" className="text-sm text-muted hover:text-foreground transition-colors">
          ← Painel
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">Nenhum organizador cadastrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-medium px-5 py-3">Organizador</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
                <th className="text-left font-medium px-5 py-3 hidden sm:table-cell">Enviado em</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={`border-t border-border hover:bg-surface-2/50 transition-colors ${row.kyc_status === "pending" ? "bg-amber-400/5" : ""}`}>
                  <td className="px-5 py-3 font-medium">{row.display_name}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[row.kyc_status] ?? ""}`}>
                      {STATUS_LABEL[row.kyc_status] ?? row.kyc_status}
                    </span>
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell text-muted text-xs">
                    {row.kyc_submitted_at
                      ? new Date(row.kyc_submitted_at).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {row.kyc_status === "pending" && (
                      <Link
                        href={`/admin/kyc/${row.id}`}
                        className="text-xs text-amber-300 hover:text-amber-200 transition-colors font-medium"
                      >
                        Revisar →
                      </Link>
                    )}
                    {row.kyc_status !== "pending" && (
                      <Link
                        href={`/admin/kyc/${row.id}`}
                        className="text-xs text-muted hover:text-foreground transition-colors"
                      >
                        Ver →
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
