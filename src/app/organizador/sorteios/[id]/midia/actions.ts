"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type State = { error: string | null; success?: boolean } | undefined;

// Saves photo_paths (product photos) to the raffle
export async function savePhotoPaths(
  _prevState: State,
  formData: FormData,
): Promise<State> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const raffleId = String(formData.get("raffleId") ?? "").trim();
  const pathsRaw = String(formData.get("photoPaths") ?? "").trim();
  const paths: string[] = pathsRaw ? JSON.parse(pathsRaw) : [];

  if (!raffleId) return { error: "Seleção não identificada." };

  // Verify ownership
  const { data: raffle } = await supabase
    .from("raffles")
    .select("id, photo_paths")
    .eq("id", raffleId)
    .eq("organizer_id", user.id)
    .maybeSingle();

  if (!raffle) return { error: "Seleção não encontrada." };

  const { error } = await supabase
    .from("raffles")
    .update({ photo_paths: paths })
    .eq("id", raffleId)
    .eq("organizer_id", user.id);

  if (error) return { error: "Erro ao salvar fotos." };

  revalidatePath(`/organizador/sorteios/${raffleId}/midia`);
  return { error: null, success: true };
}

// Saves proof_photo_paths (admin-only proof photos) to the raffle
export async function saveProofPaths(
  _prevState: State,
  formData: FormData,
): Promise<State> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const raffleId = String(formData.get("raffleId") ?? "").trim();
  const pathsRaw = String(formData.get("proofPaths") ?? "").trim();
  const paths: string[] = pathsRaw ? JSON.parse(pathsRaw) : [];

  if (!raffleId) return { error: "Seleção não identificada." };

  const { error } = await supabase
    .from("raffles")
    .update({ proof_photo_paths: paths })
    .eq("id", raffleId)
    .eq("organizer_id", user.id);

  if (error) return { error: "Erro ao salvar fotos de comprovação." };

  revalidatePath(`/organizador/sorteios/${raffleId}/midia`);
  return { error: null, success: true };
}

// Validates a YouTube URL and extracts the video ID
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// Saves YouTube video URLs for each milestone
export async function saveVideoUrls(
  _prevState: State,
  formData: FormData,
): Promise<State> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const raffleId = String(formData.get("raffleId") ?? "").trim();
  if (!raffleId) return { error: "Seleção não identificada." };

  const fields: Record<string, string | null> = {
    video_presentation_url: null,
    video_25_url: null,
    video_50_url: null,
    video_75_url: null,
    video_100_url: null,
  };

  const urlKeys = [
    "video_presentation_url",
    "video_25_url",
    "video_50_url",
    "video_75_url",
    "video_100_url",
  ] as const;

  for (const key of urlKeys) {
    const raw = String(formData.get(key) ?? "").trim();
    if (!raw) { fields[key] = null; continue; }

    const id = extractYouTubeId(raw);
    if (!id) return { error: `URL inválida para ${key.replace(/_url$/, "").replace(/_/g, " ")}: use um link do YouTube válido.` };
    fields[key] = `https://www.youtube.com/embed/${id}`;
  }

  const { error } = await supabase
    .from("raffles")
    .update(fields)
    .eq("id", raffleId)
    .eq("organizer_id", user.id);

  if (error) return { error: "Erro ao salvar vídeos." };

  revalidatePath(`/organizador/sorteios/${raffleId}/midia`);
  return { error: null, success: true };
}
