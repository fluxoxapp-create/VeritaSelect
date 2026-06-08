import Link from "next/link";
import { logoutAdmin } from "./actions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const ACTIONS = [
  "Aprovar / reprovar organizadores",
  "Aprovar / reprovar seleções e validar documentação do prêmio",
  "Revisar análises antifraude e liberar pagamentos",
  "Aplicar suspensões e banimentos",
  "Acompanhar métricas e analytics da plataforma",
];

export default async function AdminPage() {
  const supabase = createSupabaseAdminClient();
  const [{ count: pendingOrganizers }, { count: pendingRaffles }] = await Promise.all([
    supabase.from("organizers").select("id", { count: "exact", head: true }).eq("kyc_status", "pending"),
    supabase.from("raffles").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
  ]);

  const QUEUES = [
    {
      label: "Organizadores aguardando aprovação",
      value: pendingOrganizers ?? 0,
      href: "/admin/organizadores",
    },
    {
      label: "Seleções aguardando validação",
      value: pendingRaffles ?? 0,
      href: "/admin/selecoes",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Painel administrativo</h1>
          <p className="text-muted text-sm mt-1">
            Acesso restrito à equipe VeritaSelect. Todas as ações ficam registradas em log de auditoria.
          </p>
        </div>
        <form action={logoutAdmin}>
          <button
            type="submit"
            className="text-sm px-4 py-2 rounded-md border border-border text-muted hover:border-gold/60 hover:text-foreground transition-colors"
          >
            Sair
          </button>
        </form>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        {QUEUES.map((queue) => (
          <Link
            key={queue.label}
            href={queue.href}
            className="rounded-xl border border-border bg-surface p-5 hover:border-gold/40 transition-colors"
          >
            <p className="text-xs text-muted uppercase tracking-wide">{queue.label}</p>
            <p className="text-2xl font-semibold mt-2">{queue.value}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-semibold mb-3">Ações disponíveis</h2>
        <ul className="text-sm text-muted space-y-2">
          {ACTIONS.map((action) => (
            <li key={action}>• {action}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
