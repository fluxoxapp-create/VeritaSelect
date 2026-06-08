import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { approveOrganizer } from "./actions";
import { RejectForm } from "./reject-form";

type PendingOrganizer = {
  id: string;
  display_name: string;
  document_type: string;
  kyc_status: string;
  created_at: string;
  profiles: { full_name: string | null; phone: string | null } | { full_name: string | null; phone: string | null }[] | null;
};

function profile(row: PendingOrganizer["profiles"]) {
  if (!row) return null;
  return Array.isArray(row) ? (row[0] ?? null) : row;
}

export default async function AdminOrganizadoresPage() {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("organizers")
    .select("id, display_name, document_type, kyc_status, created_at, profiles!organizers_id_fkey(full_name, phone)")
    .eq("kyc_status", "pending")
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as unknown as PendingOrganizer[];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Organizadores aguardando aprovação</h1>
          <p className="text-muted text-sm mt-1">
            Verifique a identidade antes de aprovar — a aprovação libera a criação de seleções.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-muted hover:text-foreground transition-colors">
          ← Painel
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">
          Nenhuma solicitação pendente no momento.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-medium px-5 py-3">Organizador</th>
                <th className="text-left font-medium px-5 py-3">Conta</th>
                <th className="text-left font-medium px-5 py-3">Documento</th>
                <th className="text-left font-medium px-5 py-3">Solicitado em</th>
                <th className="text-left font-medium px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const owner = profile(row.profiles);
                return (
                  <tr key={row.id} className="border-t border-border align-top">
                    <td className="px-5 py-4">{row.display_name}</td>
                    <td className="px-5 py-4 text-muted">
                      {owner?.full_name ?? "—"}
                      <br />
                      <span className="text-xs">{owner?.phone ?? "—"}</span>
                    </td>
                    <td className="px-5 py-4 text-muted uppercase text-xs">{row.document_type}</td>
                    <td className="px-5 py-4 text-muted">
                      {new Date(row.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <form action={approveOrganizer}>
                          <input type="hidden" name="organizerId" value={row.id} />
                          <button
                            type="submit"
                            className="text-xs px-3 py-1.5 rounded-md border border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10 transition-colors"
                          >
                            Aprovar
                          </button>
                        </form>
                        <RejectForm organizerId={row.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
