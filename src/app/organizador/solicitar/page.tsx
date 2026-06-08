import Link from "next/link";
import { OrganizerShell } from "@/components/organizer-shell";
import { getOrganizerStatus } from "@/lib/data/organizer";
import { RequestForm } from "./request-form";

export default async function SolicitarPage() {
  const status = await getOrganizerStatus();

  return (
    <OrganizerShell
      title="Solicitar verificação"
      description="Verifique sua identidade para começar a publicar seleções na VeritaSelect."
    >
      {!status && (
        <p className="text-sm text-muted">
          Você precisa estar conectado para solicitar verificação.{" "}
          <Link href="/entrar" className="text-gold hover:underline">
            Entrar
          </Link>
        </p>
      )}

      {status?.isVerified && (
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 px-5 py-4 space-y-2 max-w-xl">
          <p className="text-sm font-medium text-emerald-300">Conta verificada</p>
          <p className="text-sm text-muted">
            Sua conta de organizador já está verificada. Você pode criar e publicar
            suas seleções.
          </p>
          <Link
            href="/organizador/sorteios"
            className="inline-block text-sm text-gold hover:underline"
          >
            Ir para minhas seleções →
          </Link>
        </div>
      )}

      {status && !status.isVerified && status.kycStatus === "pending" && (
        <div className="rounded-lg border border-gold/30 bg-gold/5 px-5 py-4 space-y-1 max-w-xl">
          <p className="text-sm font-medium text-gold">Solicitação em análise</p>
          <p className="text-sm text-muted">
            Recebemos os dados de {status.displayName ?? "sua conta"}. Nossa
            equipe está analisando sua verificação e você será notificado por
            e-mail assim que houver uma resposta — normalmente em até 5 dias
            úteis.
          </p>
        </div>
      )}

      {status && !status.isVerified && status.kycStatus === "rejected" && (
        <div className="space-y-5 max-w-xl">
          <div className="rounded-lg border border-red-400/30 bg-red-400/5 px-5 py-4 space-y-1">
            <p className="text-sm font-medium text-red-300">Solicitação não aprovada</p>
            <p className="text-sm text-muted">
              {status.kycRejectionReason ??
                "Não foi possível validar seus dados desta vez."}
            </p>
          </div>
          <p className="text-sm text-muted">
            Você pode revisar as informações e enviar uma nova solicitação abaixo.
          </p>
          <RequestForm />
        </div>
      )}

      {status && !status.isVerified && status.kycStatus === "not_submitted" && (
        <RequestForm />
      )}
    </OrganizerShell>
  );
}
