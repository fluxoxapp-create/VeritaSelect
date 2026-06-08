import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CoverCategory } from "@/lib/cover-image";

export const KYC_STATUS_LABEL: Record<string, string> = {
  not_submitted: "Não enviada",
  pending: "Em análise",
  approved: "Aprovada",
  rejected: "Reprovada",
};

export type OrganizerStatus = {
  exists: boolean;
  displayName: string | null;
  kycStatus: string;
  kycRejectionReason: string | null;
  isVerified: boolean;
};

/** The signed-in user's organizer-onboarding status — null if not signed in. */
export async function getOrganizerStatus(): Promise<OrganizerStatus | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("organizers")
    .select("display_name, kyc_status, kyc_rejection_reason, is_verified")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) {
    return { exists: false, displayName: null, kycStatus: "not_submitted", kycRejectionReason: null, isVerified: false };
  }

  return {
    exists: true,
    displayName: data.display_name,
    kycStatus: data.kyc_status,
    kycRejectionReason: data.kyc_rejection_reason,
    isVerified: data.is_verified,
  };
}

export const RAFFLE_STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  pending_review: "Em análise",
  published: "Publicada",
  paused: "Pausada",
  drawing: "Em apuração",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export type OrganizerRaffle = {
  id: string;
  slug: string;
  title: string;
  category: CoverCategory;
  totalCotas: number;
  soldCotas: number;
  drawDate: string;
  status: string;
  statusLabel: string;
  rejectionReason: string | null;
};

type RaffleRow = {
  id: string;
  slug: string;
  title: string;
  category: CoverCategory;
  total_cotas: number;
  draw_date: string;
  status: string;
  rejection_reason: string | null;
};

type ClaimedNumberRow = {
  raffle_id: string;
  purchase: { status: string } | { status: string }[] | null;
};

function singlePurchase(purchase: ClaimedNumberRow["purchase"]): { status: string } | null {
  if (!purchase) return null;
  return Array.isArray(purchase) ? (purchase[0] ?? null) : purchase;
}

/** The signed-in organizer's raffles with live sold counts — null if not signed in. */
export async function getOrganizerRaffles(): Promise<OrganizerRaffle[] | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: raffles } = await supabase
    .from("raffles")
    .select("id, slug, title, category, total_cotas, draw_date, status, rejection_reason")
    .eq("organizer_id", user.id)
    .order("created_at", { ascending: false });

  const rows = (raffles ?? []) as RaffleRow[];
  if (rows.length === 0) return [];

  const raffleIds = rows.map((row) => row.id);
  const { data: claimedNumbers } = await supabase
    .from("raffle_numbers")
    .select("raffle_id, purchase:compras(status)")
    .in("raffle_id", raffleIds)
    .not("purchase_id", "is", null);

  const soldByRaffle = new Map<string, number>();
  for (const row of (claimedNumbers ?? []) as ClaimedNumberRow[]) {
    if (singlePurchase(row.purchase)?.status !== "paid") continue;
    soldByRaffle.set(row.raffle_id, (soldByRaffle.get(row.raffle_id) ?? 0) + 1);
  }

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    totalCotas: row.total_cotas,
    soldCotas: soldByRaffle.get(row.id) ?? 0,
    drawDate: row.draw_date,
    status: row.status,
    statusLabel: RAFFLE_STATUS_LABEL[row.status] ?? row.status,
    rejectionReason: row.rejection_reason,
  }));
}
