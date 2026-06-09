import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { KycReviewForm } from "./review-form";

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

export default async function KycReviewPage({
  params,
}: {
  params: Promise<{ organizerId: string }>;
}) {
  const { organizerId } = await params;
  const admin = createSupabaseAdminClient();

  const { data: organizer } = await admin
    .from("organizers")
    .select("id, display_name, kyc_status, kyc_rejection_reason, kyc_selfie_path, kyc_doc_front_path, kyc_doc_back_path, kyc_submitted_at, is_verified")
    .eq("id", organizerId)
    .maybeSingle();

  if (!organizer) notFound();

  function signedUrl(path: string | null): string | null {
    if (!path) return null;
    // Use admin to get a signed URL so private bucket files are viewable
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/sign/kyc-docs/${path}`;
  }

  const docs = [
    { label: "Selfie com documento", path: organizer.kyc_selfie_path },
    { label: "Documento — frente", path: organizer.kyc_doc_front_path },
    { label: "Documento — verso", path: organizer.kyc_doc_back_path },
  ];

  const canReview = organizer.kyc_status === "pending";

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{organizer.display_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2.5 py-0.5 rounded-full border ${STATUS_COLOR[organizer.kyc_status] ?? ""}`}>
              {STATUS_LABEL[organizer.kyc_status] ?? organizer.kyc_status}
            </span>
            {organizer.kyc_submitted_at && (
              <span className="text-xs text-muted">
                Enviado em {new Date(organizer.kyc_submitted_at).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
        </div>
        <Link href="/admin/kyc" className="text-sm text-muted hover:text-foreground transition-colors shrink-0">
          ← KYC
        </Link>
      </div>

      {organizer.kyc_rejection_reason && (
        <div className="rounded-lg border border-red-400/30 bg-red-400/5 px-5 py-3 text-sm text-red-400">
          Motivo da reprovação anterior: {organizer.kyc_rejection_reason}
        </div>
      )}

      {/* Document photos */}
      <div className="grid sm:grid-cols-3 gap-4">
        {docs.map((doc) => {
          const url = signedUrl(doc.path);
          return (
            <div key={doc.label} className="space-y-2">
              <p className="text-xs text-muted font-medium uppercase tracking-wide">{doc.label}</p>
              <div className="aspect-[4/3] rounded-xl border border-border bg-surface-2 overflow-hidden flex items-center justify-center">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/kyc-docs/${doc.path}`}
                    alt={doc.label}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <p className="text-sm text-muted">Não enviado</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Review form */}
      {canReview && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <h2 className="font-semibold">Decisão</h2>
          <KycReviewForm organizerId={organizerId} />
        </div>
      )}

      {!canReview && organizer.kyc_status === "approved" && (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 px-5 py-4 text-center">
          <p className="text-emerald-300 font-medium">Organizador verificado.</p>
        </div>
      )}
    </div>
  );
}
