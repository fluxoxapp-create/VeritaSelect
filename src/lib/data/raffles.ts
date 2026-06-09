import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CoverCategory } from "@/lib/cover-image";

export type Raffle = {
  slug: string;
  title: string;
  category: CoverCategory;
  organizer: string;
  organizerVerified: boolean;
  cotaPrice: number;
  totalCotas: number;
  soldCotas: number;
  drawDate: string;
  description: string;
  photoPaths: string[];
  videoPresentation: string | null;
  video25: string | null;
  video50: string | null;
  video75: string | null;
  video100: string | null;
};

type RafflePublicRow = {
  slug: string;
  title: string;
  category: CoverCategory;
  organizer_name: string;
  organizer_verified: boolean;
  cota_price_cents: number;
  total_cotas: number;
  sold_cotas: number;
  draw_date: string;
  description: string;
  photo_paths: string[] | null;
  video_presentation_url: string | null;
  video_25_url: string | null;
  video_50_url: string | null;
  video_75_url: string | null;
  video_100_url: string | null;
};

function mapRaffle(row: RafflePublicRow): Raffle {
  return {
    slug: row.slug,
    title: row.title,
    category: row.category,
    organizer: row.organizer_name,
    organizerVerified: row.organizer_verified,
    cotaPrice: row.cota_price_cents / 100,
    totalCotas: row.total_cotas,
    soldCotas: row.sold_cotas,
    drawDate: row.draw_date,
    description: row.description,
    photoPaths: row.photo_paths ?? [],
    videoPresentation: row.video_presentation_url ?? null,
    video25: row.video_25_url ?? null,
    video50: row.video_50_url ?? null,
    video75: row.video_75_url ?? null,
    video100: row.video_100_url ?? null,
  };
}

/** Published raffles, ordered by draw date — what the storefront shows. */
export async function getPublishedRaffles(): Promise<Raffle[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("raffles_public")
    .select(
      "slug, title, category, organizer_name, organizer_verified, cota_price_cents, total_cotas, sold_cotas, draw_date, description, photo_paths, video_presentation_url, video_25_url, video_50_url, video_75_url, video_100_url",
    )
    .order("draw_date", { ascending: true });

  if (error || !data) return [];
  return data.map(mapRaffle);
}

export async function getRaffleBySlug(slug: string): Promise<Raffle | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("raffles_public")
    .select(
      "slug, title, category, organizer_name, organizer_verified, cota_price_cents, total_cotas, sold_cotas, draw_date, description, photo_paths, video_presentation_url, video_25_url, video_50_url, video_75_url, video_100_url",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return mapRaffle(data);
}

export function progress(raffle: Pick<Raffle, "soldCotas" | "totalCotas">) {
  if (raffle.totalCotas <= 0) return 0;
  return Math.min(100, Math.round((raffle.soldCotas / raffle.totalCotas) * 100));
}
