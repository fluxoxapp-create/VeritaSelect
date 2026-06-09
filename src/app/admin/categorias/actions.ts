"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function addCategory(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "🏆").trim();
  const keywords = String(formData.get("keywords") ?? "").trim();

  if (!name) return { error: "Nome obrigatório." };

  const supabase = createSupabaseAdminClient();

  const { data: maxRow } = await supabase
    .from("categories")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = ((maxRow?.display_order as number) ?? 0) + 10;

  const { error } = await supabase.from("categories").insert({
    name,
    icon: icon || "🏆",
    keywords: keywords || name.toLowerCase(),
    display_order: nextOrder,
    is_active: true,
  });

  if (error) return { error: error.code === "23505" ? "Já existe uma categoria com esse nome." : "Erro ao criar categoria." };

  revalidatePath("/admin/categorias");
  return { error: null };
}

export async function toggleCategory(id: string, isActive: boolean) {
  const supabase = createSupabaseAdminClient();
  await supabase.from("categories").update({ is_active: !isActive }).eq("id", id);
  revalidatePath("/admin/categorias");
}

export async function moveCategoryUp(id: string) {
  const supabase = createSupabaseAdminClient();

  const { data: current } = await supabase
    .from("categories")
    .select("display_order")
    .eq("id", id)
    .maybeSingle();

  if (!current) return;

  const { data: above } = await supabase
    .from("categories")
    .select("id, display_order")
    .lt("display_order", current.display_order)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!above) return;

  await Promise.all([
    supabase.from("categories").update({ display_order: above.display_order }).eq("id", id),
    supabase.from("categories").update({ display_order: current.display_order }).eq("id", above.id),
  ]);

  revalidatePath("/admin/categorias");
}

export async function moveCategoryDown(id: string) {
  const supabase = createSupabaseAdminClient();

  const { data: current } = await supabase
    .from("categories")
    .select("display_order")
    .eq("id", id)
    .maybeSingle();

  if (!current) return;

  const { data: below } = await supabase
    .from("categories")
    .select("id, display_order")
    .gt("display_order", current.display_order)
    .order("display_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!below) return;

  await Promise.all([
    supabase.from("categories").update({ display_order: below.display_order }).eq("id", id),
    supabase.from("categories").update({ display_order: current.display_order }).eq("id", below.id),
  ]);

  revalidatePath("/admin/categorias");
}
