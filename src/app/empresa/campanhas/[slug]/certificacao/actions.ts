"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireEmpresa } from "@/lib/auth/session";
import { MIN_ALTERNATIVAS } from "@/lib/domain/certificacao";

type FormState = { error?: string; ok?: string } | undefined;

/** Confirma que a campanha é da empresa da sessão. O tenant vem da sessão. */
async function carregarCampanha(slug: string, empresaId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("campanhas")
    .select("id, slug, empresa_id, exige_certificacao")
    .eq("slug", slug)
    .eq("empresa_id", empresaId)
    .maybeSingle();
  return data as { id: string; slug: string; empresa_id: string; exige_certificacao: boolean } | null;
}

/**
 * Material de estudo da campanha.
 *
 * Aceita apenas URL http(s). O material vive fora da plataforma de propósito
 * (YouTube não listado, PDF em drive da empresa): hospedar conteúdo de
 * terceiro aqui criaria responsabilidade editorial sobre o que a empresa
 * afirma do próprio produto.
 */
export async function salvarMaterial(_prev: FormState, formData: FormData): Promise<FormState> {
  const sessao = await requireEmpresa();
  const slug = String(formData.get("slug") ?? "");
  const url = String(formData.get("materialUrl") ?? "").trim();
  const exige = formData.get("exigeCertificacao") === "on";

  const campanha = await carregarCampanha(slug, sessao.empresa.id);
  if (!campanha) return { error: "Campanha não encontrada." };

  if (url) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { error: "Informe uma URL completa, começando com https://" };
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { error: "Apenas endereços http(s) são aceitos." };
    }
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("campanhas")
    .update({ certificacao_material_url: url || null, exige_certificacao: exige })
    .eq("id", campanha.id);

  if (error) return { error: "Não foi possível salvar agora. Tente novamente." };

  revalidatePath(`/empresa/campanhas/${slug}/certificacao`);
  return { ok: "Material salvo." };
}

/**
 * Cadastro de uma questão com suas alternativas.
 *
 * Exatamente uma alternativa correta: sem isso a correção do servidor não tem
 * gabarito determinístico, e o parceiro seria barrado por uma questão que
 * ninguém consegue acertar.
 */
export async function adicionarQuestao(_prev: FormState, formData: FormData): Promise<FormState> {
  const sessao = await requireEmpresa();
  const slug = String(formData.get("slug") ?? "");
  const enunciado = String(formData.get("enunciado") ?? "").trim();
  const corretaIdx = String(formData.get("correta") ?? "");

  const campanha = await carregarCampanha(slug, sessao.empresa.id);
  if (!campanha) return { error: "Campanha não encontrada." };

  if (enunciado.length < 10) {
    return { error: "O enunciado precisa de pelo menos 10 caracteres." };
  }

  const textos: string[] = [];
  for (let i = 0; i < 5; i++) {
    const t = String(formData.get(`alternativa_${i}`) ?? "").trim();
    if (t) textos.push(t);
  }

  if (textos.length < MIN_ALTERNATIVAS) {
    return { error: `Informe pelo menos ${MIN_ALTERNATIVAS} alternativas.` };
  }

  const idx = Number(corretaIdx);
  if (!Number.isInteger(idx) || idx < 0 || idx >= textos.length) {
    return { error: "Marque qual alternativa é a correta." };
  }

  const admin = createSupabaseAdminClient();

  const { data: proxima } = await admin
    .from("certificacao_questoes")
    .select("ordem")
    .eq("campanha_id", campanha.id)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: questao, error } = await admin
    .from("certificacao_questoes")
    .insert({
      campanha_id: campanha.id,
      enunciado,
      ordem: ((proxima?.ordem as number | undefined) ?? -1) + 1,
    })
    .select("id")
    .single();

  if (error || !questao) return { error: "Não foi possível salvar a questão agora." };

  const { error: altError } = await admin.from("certificacao_alternativas").insert(
    textos.map((texto, i) => ({
      questao_id: questao.id,
      texto,
      correta: i === idx,
      ordem: i,
    })),
  );

  if (altError) {
    // Questão sem alternativa trava o questionário inteiro para o parceiro.
    await admin.from("certificacao_questoes").delete().eq("id", questao.id);
    return { error: "Não foi possível salvar as alternativas. Tente novamente." };
  }

  revalidatePath(`/empresa/campanhas/${slug}/certificacao`);
  return { ok: "Questão adicionada." };
}

/**
 * Desativa a questão em vez de apagá-la: tentativas antigas apontam para ela
 * pelo `certificacao_respostas.questao_id`, e apagar quebraria o histórico
 * que o parceiro tem direito de consultar.
 */
export async function desativarQuestao(_prev: FormState, formData: FormData): Promise<FormState> {
  const sessao = await requireEmpresa();
  const slug = String(formData.get("slug") ?? "");
  const questaoId = String(formData.get("questaoId") ?? "");

  const campanha = await carregarCampanha(slug, sessao.empresa.id);
  if (!campanha) return { error: "Campanha não encontrada." };

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("certificacao_questoes")
    .update({ ativa: false })
    .eq("id", questaoId)
    .eq("campanha_id", campanha.id);

  if (error) return { error: "Não foi possível remover a questão agora." };

  revalidatePath(`/empresa/campanhas/${slug}/certificacao`);
  return { ok: "Questão removida do questionário." };
}
