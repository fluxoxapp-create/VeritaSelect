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
  };
}

/** Published raffles, ordered by draw date — what the storefront shows. */
export async function getPublishedRaffles(): Promise<Raffle[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("raffles_public")
    .select(
      "slug, title, category, organizer_name, organizer_verified, cota_price_cents, total_cotas, sold_cotas, draw_date, description",
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
      "slug, title, category, organizer_name, organizer_verified, cota_price_cents, total_cotas, sold_cotas, draw_date, description",
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
