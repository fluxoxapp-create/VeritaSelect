import Link from "next/link";
import { OrganizerShell } from "@/components/organizer-shell";
import { getOrganizerStatus } from "@/lib/data/organizer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NewRaffleForm } from "./new-raffle-form";

async function getCategories() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("categories")
    .select("name, icon")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  return (data ?? []) as { name: string; icon: string }[];
}

export default async function NovaSelecaoPage() {
  const [status, categories] = await Promise.all([
    getOrganizerStatus(),
    getCategories(),
  ]);

  return (
    <OrganizerShell
      title="Nova seleção"
      description="Cadastre os detalhes do prêmio. A seleção fica como rascunho até você enviá-la para análise."
    >
      {!status && (
        <p className="text-sm text-muted">
          Você precisa estar conectado para criar uma seleção.{" "}
          <Link href="/entrar" className="text-gold hover:underline">
            Entrar
          </Link>
        </p>
      )}

      {status && !status.isVerified && (
        <div className="rounded-lg border border-gold/30 bg-gold/5 px-5 py-4 space-y-2 max-w-xl">
          <p className="text-sm font-medium text-gold">Verificação necessária</p>
          <p className="text-sm text-muted">
            Você precisa concluir a verificação de organizador antes de criar seleções.
          </p>
          <Link href="/organizador/solicitar" className="inline-block text-sm text-gold hover:underline">
            Solicitar verificação →
          </Link>
        </div>
      )}

      {status?.isVerified && <NewRaffleForm categories={categories} />}
    </OrganizerShell>
  );
}
