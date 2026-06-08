import Link from "next/link";
import { OrganizerShell } from "@/components/organizer-shell";
import { getOrganizerStatus } from "@/lib/data/organizer";
import { NewRaffleForm } from "./new-raffle-form";

export default async function NovaSelecaoPage() {
  const status = await getOrganizerStatus();

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
            Você precisa concluir a verificação de organizador antes de criar
            seleções.
          </p>
          <Link href="/organizador/solicitar" className="inline-block text-sm text-gold hover:underline">
            Solicitar verificação →
          </Link>
        </div>
      )}

      {status?.isVerified && <NewRaffleForm />}
    </OrganizerShell>
  );
}
