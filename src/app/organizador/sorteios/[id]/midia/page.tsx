import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OrganizerShell } from "@/components/organizer-shell";
import { PhotoUpload } from "./photo-upload";
import { VideoForm } from "./video-form";
import { savePhotoPaths, saveProofPaths } from "./actions";

export default async function MidiaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: raffle } = await supabase
    .from("raffles")
    .select("id, title, status, photo_paths, proof_photo_paths, video_presentation_url, video_25_url, video_50_url, video_75_url, video_100_url")
    .eq("id", id)
    .eq("organizer_id", user.id)
    .maybeSingle() as {
      data: {
        id: string; title: string; status: string;
        photo_paths: string[]; proof_photo_paths: string[];
        video_presentation_url: string | null;
        video_25_url: string | null;
        video_50_url: string | null;
        video_75_url: string | null;
        video_100_url: string | null;
      } | null
    };

  if (!raffle) notFound();

  const videoValues = {
    video_presentation_url: raffle.video_presentation_url,
    video_25_url: raffle.video_25_url,
    video_50_url: raffle.video_50_url,
    video_75_url: raffle.video_75_url,
    video_100_url: raffle.video_100_url,
  };

  return (
    <OrganizerShell
      title={`Mídia — ${raffle.title}`}
      description="Fotos do produto, fotos de comprovação (apenas para análise interna) e vídeos progressivos do YouTube."
    >
      <div className="max-w-2xl space-y-10">

        {/* ── Fotos do produto ── */}
        <section className="rounded-xl border border-border bg-surface p-6 space-y-6">
          <div>
            <h2 className="font-semibold">Fotos do produto</h2>
            <p className="text-xs text-muted mt-0.5">
              Estas fotos aparecem na página pública da seleção. Envie fotos reais do produto —
              não use imagens de internet. Máx. 10 fotos · 5 MB cada.
            </p>
          </div>
          <PhotoUpload
            raffleId={raffle.id}
            bucket="raffle-photos"
            fieldName="photoPaths"
            action={savePhotoPaths}
            initialPaths={raffle.photo_paths ?? []}
            label="Fotos públicas do produto"
            description="JPG, PNG ou WEBP. Aparecem na página da seleção para todos os compradores."
            maxFiles={10}
          />
        </section>

        {/* ── Fotos de comprovação ── */}
        <section className="rounded-xl border border-border bg-surface p-6 space-y-6">
          <div>
            <h2 className="font-semibold">Fotos de comprovação</h2>
            <p className="text-xs text-muted mt-0.5">
              Visíveis apenas pela equipe VeritaSelect durante a análise. Envie nota fiscal,
              laudo, certificado de propriedade ou fotos adicionais que comprovem a existência
              do prêmio. Não aparecem para compradores. Máx. 10 fotos · 5 MB cada.
            </p>
          </div>
          <PhotoUpload
            raffleId={raffle.id}
            bucket="raffle-proof"
            fieldName="proofPaths"
            action={saveProofPaths}
            initialPaths={raffle.proof_photo_paths ?? []}
            label="Documentação interna"
            description="NF, laudo, certificado ou fotos comprobatórias. Nunca exibidos publicamente."
            maxFiles={10}
          />
        </section>

        {/* ── Vídeos YouTube ── */}
        <section className="rounded-xl border border-border bg-surface p-6 space-y-6">
          <div>
            <h2 className="font-semibold">Vídeos por fase</h2>
            <p className="text-xs text-muted mt-0.5">
              Cole links do YouTube para cada marco de vendas. O vídeo ativo muda conforme as
              cotas são vendidas — use isso para criar engajamento progressivo. Todos os campos
              são opcionais.
            </p>
          </div>
          <VideoForm raffleId={raffle.id} initialValues={videoValues} />
        </section>

        <div className="pb-4">
          <Link
            href="/organizador/sorteios"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            ← Minhas seleções
          </Link>
        </div>
      </div>
    </OrganizerShell>
  );
}
