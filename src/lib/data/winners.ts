import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CoverCategory } from "@/lib/cover-image";

export type Winner = {
  number: string;
  name: string;
  prize: string;
  raffleSlug: string;
  raffleTitle: string;
  raffleCategory: CoverCategory;
  drawnAt: string;
};

type GanhadorPublicRow = {
  raffle_slug: string;
  raffle_title: string;
  raffle_category: CoverCategory;
  prize_description: string;
  drawn_number: number;
  drawn_at: string;
  winner_display_name: string;
  winner_cidade: string | null;
  winner_uf: string | null;
};

function mapWinner(row: GanhadorPublicRow): Winner {
  const location =
    row.winner_cidade && row.winner_uf ? ` — ${row.winner_cidade}/${row.winner_uf}` : "";

  return {
    number: String(row.drawn_number).padStart(5, "0"),
    name: `${row.winner_display_name}${location}`,
    prize: row.prize_description,
    raffleSlug: row.raffle_slug,
    raffleTitle: row.raffle_title,
    raffleCategory: row.raffle_category,
    drawnAt: row.drawn_at,
  };
}

export async function getWinners(limit = 12): Promise<Winner[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ganhadores_public")
    .select(
      "raffle_slug, raffle_title, raffle_category, prize_description, drawn_number, drawn_at, winner_display_name, winner_cidade, winner_uf",
    )
    .order("drawn_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map(mapWinner);
}
