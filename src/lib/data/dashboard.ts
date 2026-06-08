import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CoverCategory } from "@/lib/cover-image";

export type DashboardStat = { label: string; value: string };

export type ActiveParticipation = {
  slug: string;
  title: string;
  category: CoverCategory;
  drawDate: string;
  accessCount: number;
};

export type DashboardSummary = {
  stats: DashboardStat[];
  activeParticipations: ActiveParticipation[];
};

type RaffleRef = {
  slug: string;
  title: string;
  category: CoverCategory;
  draw_date: string;
  status: string;
};

type CompraRow = {
  quantity: number;
  total_cents: number;
  raffle: RaffleRef | RaffleRef[] | null;
};

function currency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function singleRaffle<T>(raffle: T | T[] | null): T | null {
  if (!raffle) return null;
  return Array.isArray(raffle) ? (raffle[0] ?? null) : raffle;
}

const PURCHASE_STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pendente",
  paid: "Confirmado",
  expired: "Expirado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  fraud_review: "Em análise",
};

export type PurchaseRow = {
  id: string;
  date: string;
  qty: number;
  total: number;
  status: string;
  raffle: { slug: string; title: string; category: CoverCategory } | null;
};

type PurchaseQueryRow = {
  id: string;
  quantity: number;
  total_cents: number;
  status: string;
  created_at: string;
  raffle: { slug: string; title: string; category: CoverCategory } | { slug: string; title: string; category: CoverCategory }[] | null;
};

/** Buyer's purchase history — null when there is no signed-in user. */
export async function getBuyerPurchases(): Promise<PurchaseRow[] | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("compras")
    .select("id, quantity, total_cents, status, created_at, raffle:raffles(slug, title, category)")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  return ((data ?? []) as PurchaseQueryRow[]).map((row) => ({
    id: row.id,
    date: row.created_at,
    qty: row.quantity,
    total: row.total_cents / 100,
    status: PURCHASE_STATUS_LABEL[row.status] ?? row.status,
    raffle: singleRaffle(row.raffle),
  }));
}

export type RaffleNumbersGroup = {
  raffle: { slug: string; title: string; category: CoverCategory; drawDate: string };
  numbers: string[];
};

type RaffleNumberQueryRow = {
  number: number;
  raffle: { slug: string; title: string; category: CoverCategory; draw_date: string } | { slug: string; title: string; category: CoverCategory; draw_date: string }[] | null;
};

/** Buyer's claimed numbers, grouped by raffle — null when no signed-in user. */
export async function getBuyerNumbers(): Promise<RaffleNumbersGroup[] | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("raffle_numbers")
    .select("number, raffle:raffles(slug, title, category, draw_date)")
    .not("purchase_id", "is", null)
    .order("number", { ascending: true });

  const groups = new Map<string, RaffleNumbersGroup>();
  for (const row of (data ?? []) as RaffleNumberQueryRow[]) {
    const raffle = singleRaffle(row.raffle);
    if (!raffle) continue;

    const formatted = String(row.number).padStart(5, "0");
    const existing = groups.get(raffle.slug);
    if (existing) {
      existing.numbers.push(formatted);
    } else {
      groups.set(raffle.slug, {
        raffle: {
          slug: raffle.slug,
          title: raffle.title,
          category: raffle.category,
          drawDate: raffle.draw_date,
        },
        numbers: [formatted],
      });
    }
  }

  return [...groups.values()];
}

/** Buyer-facing dashboard summary — null when there is no signed-in user. */
export async function getBuyerDashboard(): Promise<DashboardSummary | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: compras }, { count: prizesWon }] = await Promise.all([
    supabase
      .from("compras")
      .select("quantity, total_cents, raffle:raffles(slug, title, category, draw_date, status)")
      .eq("buyer_id", user.id)
      .eq("status", "paid"),
    supabase
      .from("ganhadores")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", user.id),
  ]);

  const purchases = (compras ?? []) as CompraRow[];

  let totalInvestedCents = 0;
  let activeAccessCount = 0;
  const activeByRaffle = new Map<string, ActiveParticipation>();

  for (const purchase of purchases) {
    totalInvestedCents += purchase.total_cents;

    const raffle = singleRaffle(purchase.raffle);
    if (!raffle || raffle.status === "completed" || raffle.status === "cancelled") continue;

    activeAccessCount += purchase.quantity;
    const existing = activeByRaffle.get(raffle.slug);
    if (existing) {
      existing.accessCount += purchase.quantity;
    } else {
      activeByRaffle.set(raffle.slug, {
        slug: raffle.slug,
        title: raffle.title,
        category: raffle.category,
        drawDate: raffle.draw_date,
        accessCount: purchase.quantity,
      });
    }
  }

  return {
    stats: [
      { label: "Acessos ativos", value: String(activeAccessCount) },
      { label: "Seleções participando", value: String(activeByRaffle.size) },
      { label: "Total investido", value: currency(totalInvestedCents) },
      { label: "Prêmios ganhos", value: String(prizesWon ?? 0) },
    ],
    activeParticipations: [...activeByRaffle.values()],
  };
}
