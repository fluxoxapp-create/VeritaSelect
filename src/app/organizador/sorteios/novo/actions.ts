"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CoverCategory } from "@/lib/cover-image";

type FormState = { error?: string } | undefined;

const CATEGORIES: CoverCategory[] = ["Agro", "Caminhonetes", "Motos", "Náutico", "Automotivo"];

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

  if (!title || !category || !description || !cotaPriceRaw || !totalCotasRaw || !drawDate) {
    return { error: "Preencha todos os campos." };
  }
  if (!CATEGORIES.includes(category as CoverCategory)) {
    return { error: "Selecione uma categoria válida." };
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

  const supabase = await createSupabaseServerClient();
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
      status: "draft",
    });

    if (!error) redirect("/organizador/sorteios");

    if (error.code !== "23505") {
      return { error: "Não foi possível criar a seleção agora. Tente novamente em instantes." };
    }
    // unique slug conflict — retry with a suffixed slug
  }

  return { error: "Não foi possível gerar um identificador único para esta seleção. Tente um título diferente." };
}
