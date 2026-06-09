"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type FormState = { error?: string } | undefined;
const DRAW_METHODS = ["loteria_federal", "live"] as const;

function slugify(title: string) {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 7);
}

function parseBrlToCents(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

export async function createRaffleDraft(_prevState: FormState, formData: FormData): Promise<FormState> {
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const cotaPriceRaw = String(formData.get("cotaPrice") ?? "");
  const totalCotasRaw = String(formData.get("totalCotas") ?? "");
  const drawDate = String(formData.get("drawDate") ?? "");
  const drawMethod = String(formData.get("drawMethod") ?? "loteria_federal");

  // Optional enrichment fields (already processed by the client form)
  const prizeValueCentsRaw = String(formData.get("prizeValueCents") ?? "");
  const minCotasGoalRaw = String(formData.get("minCotasGoal") ?? "");
  const deliveryCity = String(formData.get("deliveryCity") ?? "").trim() || null;
  const deliveryUfRaw = String(formData.get("deliveryUf") ?? "").trim().toUpperCase();
  const deliveryUf = deliveryUfRaw.length === 2 ? deliveryUfRaw : null;

  if (!title || !category || !description || !cotaPriceRaw || !totalCotasRaw || !drawDate) {
    return { error: "Preencha todos os campos obrigatórios." };
  }
  if (description.length > 900) {
    return { error: "A descrição pode ter no máximo 900 caracteres." };
  }
  if (!DRAW_METHODS.includes(drawMethod as typeof DRAW_METHODS[number])) {
    return { error: "Método de apuração inválido." };
  }

  const cotaPriceCents = parseBrlToCents(cotaPriceRaw);
  if (!cotaPriceCents || cotaPriceCents <= 0) {
    return { error: "Informe um valor de acesso válido." };
  }

  const totalCotas = Number.parseInt(totalCotasRaw, 10);
  if (!Number.isInteger(totalCotas) || totalCotas <= 0) {
    return { error: "Informe a quantidade de acessos disponíveis." };
  }

  const drawDateValue = new Date(`${drawDate}T00:00:00`);
  if (Number.isNaN(drawDateValue.getTime()) || drawDateValue.getTime() <= Date.now()) {
    return { error: "A data de apuração deve ser no futuro." };
  }

  const prizeValueCents = Number.parseInt(prizeValueCentsRaw, 10);
  const minCotasGoal = Number.parseInt(minCotasGoalRaw, 10);

  const supabase = await createSupabaseServerClient();

  // Validate category against DB (active categories only)
  const { data: validCategories } = await supabase
    .from("categories")
    .select("name")
    .eq("is_active", true);
  const validNames = (validCategories ?? []).map((c: { name: string }) => c.name);
  if (!validNames.includes(category)) {
    return { error: "Selecione uma categoria válida." };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: organizer } = await supabase
    .from("organizers")
    .select("is_verified")
    .eq("id", user.id)
    .maybeSingle();

  if (!organizer?.is_verified) {
    return { error: "Sua conta de organizador ainda não está verificada." };
  }

  const baseSlug = slugify(title) || "selecao";

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${randomSuffix()}`;
    const { error } = await supabase.from("raffles").insert({
      organizer_id: user.id,
      slug,
      title,
      category,
      description,
      cota_price_cents: cotaPriceCents,
      total_cotas: totalCotas,
      draw_date: drawDate,
      draw_method: drawMethod,
      status: "draft",
      ...(Number.isFinite(prizeValueCents) && prizeValueCents > 0 ? { prize_market_value_cents: prizeValueCents } : {}),
      ...(Number.isFinite(minCotasGoal) && minCotasGoal > 0 ? { min_cotas_goal: minCotasGoal } : {}),
      ...(deliveryCity ? { delivery_city: deliveryCity } : {}),
      ...(deliveryUf ? { delivery_uf: deliveryUf } : {}),
    });

    if (!error) redirect("/organizador/sorteios");

    if (error.code !== "23505") {
      return { error: "Não foi possível criar a seleção agora. Tente novamente em instantes." };
    }
  }

  return { error: "Não foi possível gerar um identificador único. Tente um título diferente." };
}
