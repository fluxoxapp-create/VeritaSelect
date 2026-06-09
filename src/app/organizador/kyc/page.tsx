import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OrganizerShell } from "@/components/organizer-shell";
import { KycUploadForm } from "./kyc-upload-form";

const STATUS_INFO: Record<string, { label: string; color: string; message: string }> = {
  not_submitted: {
    label: "Não enviado",
    color: "text-muted border-border",
    message: "Envie os documentos abaixo para iniciar a verificação de identidade.",
  },
  pending: {
    label: "Em análise",
    color: "text-amber-300 border-amber-400/40",
    message: "Documentos enviados. Nossa equipe está analisando — prazo de até 2 dias úteis.",
  },
  approved: {
    label: "Verificado",
    color: "text-emerald-300 border-emerald-400/40",
    message: "Sua identidade foi verificada. Você pode criar seleções verificadas.",
  },
  rejected: {
    label: "Reprovado",
    color: "text-red-400 border-red-400/40",
    message: "Verificação reprovada. Corrija os documentos e reenvie.",
  },
};

export default async function KycPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: organizer } = await supabase
    .from("organizers")
    .select("id, kyc_status, kyc_rejection_reason, kyc_selfie_path, kyc_doc_front_path, kyc_doc_back_path, kyc_submitted_at")
    .eq("id", user.id)
    .maybeSingle() as {
      data: {
        id: string;
        kyc_status: string;
        kyc_rejection_reason: string | null;
        kyc_selfie_path: string | null;
        kyc_doc_front_path: string | null;
        kyc_doc_back_path: string | null;
        kyc_submitted_at: string | null;
      } | null
    };

  if (!organizer) redirect("/organizador/solicitar");

  const info = STATUS_INFO[organizer.kyc_status] ?? STATUS_INFO.not_submitted;
  const canSubmit = organizer.kyc_status !== "pending" && organizer.kyc_status !== "approved";

  return (
    <OrganizerShell
      title="Verificação de identidade"
      description="Para publicar seleções você precisa verificar sua identidade. Enviamos selfie + documento para análise interna — nunca exibidos publicamente."
    >
      <div className="max-w-lg space-y-8">

        {/* Status banner */}
        <div className={`rounded-xl border px-5 py-4 ${info.color}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${info.color}`}>{info.label}</span>
            {organizer.kyc_submitted_at && (
              <span className="text-xs text-muted">
                Enviado em {new Date(organizer.kyc_submitted_at).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
          <p className="text-sm">{info.message}</p>
          {organizer.kyc_rejection_reason && (
            <p className="text-sm text-red-400 mt-2 border-t border-red-400/20 pt-2">
              Motivo: {organizer.kyc_rejection_reason}
            </p>
          )}
        </div>

        {/* Instructions */}
        {canSubmit && (
          <div className="rounded-lg border border-border bg-surface-2 px-5 py-4 text-sm text-muted space-y-2">
            <p className="font-medium text-foreground">O que você vai precisar enviar</p>
            <ul className="space-y-1.5 list-disc list-inside">
              <li><strong className="text-foreground">Selfie segurando o documento</strong> — rosto visível, documento legível</li>
              <li><strong className="text-foreground">Frente do RG ou CNH</strong> — sem reflexo, sem cortes</li>
              <li><strong className="text-foreground">Verso do RG ou CNH</strong> — mesmas condições</li>
            </ul>
            <p className="text-xs pt-1 border-t border-border/60">
              Estas imagens são tratadas como dados sensíveis (LGPD Art. 5° XI) — nunca compartilhadas com terceiros e usadas apenas para validação de identidade.
            </p>
          </div>
        )}

        {/* Upload form */}
        {canSubmit ? (
          <KycUploadForm
            userId={user.id}
            initialPaths={{
              selfie: organizer.kyc_selfie_path,
              front: organizer.kyc_doc_front_path,
              back: organizer.kyc_doc_back_path,
            }}
          />
        ) : organizer.kyc_status === "approved" ? (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-6 text-center space-y-1">
            <p className="text-3xl">✓</p>
            <p className="font-semibold text-emerald-300">Identidade verificada</p>
            <p className="text-sm text-muted">Você pode criar e publicar seleções normalmente.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-5 text-sm text-amber-300 text-center">
            Aguardando análise — você será notificado quando a verificação for concluída.
          </div>
        )}
      </div>
    </OrganizerShell>
  );
}
