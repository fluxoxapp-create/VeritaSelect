"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAdminEmail } from "@/lib/admin-session";

type FormState = { error?: string; ok?: string } | undefined;

/**
 * Verificação manual de credencial profissional — política 07 §6.
 *
 * A decisão é sempre registrada com QUEM verificou, QUANDO e QUAL FONTE foi
 * consultada (§6.4). A fonte não é campo decorativo: sem ela não há como
 * defender depois por que a liberação foi concedida.
 *
 * O gate de acesso a /admin/* é do proxy; aqui a sessão serve para atribuir
 * a decisão a uma pessoa no log de auditoria.
 */
export async function aprovarHabilitacao(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await getAdminEmail();
  if (!admin) return { error: "Sessão administrativa expirada." };

  const id = String(formData.get("habilitacaoId") ?? "");
  const fonte = String(formData.get("fonteConsultada") ?? "").trim();

  if (!id) return { error: "Habilitação não informada." };
  if (fonte.length < 8) {
    return {
      error:
        "Informe a fonte consultada (ex.: 'consulta pública SUSEP em 10/08/2026'). Toda verificação precisa dizer onde o registro foi conferido.",
    };
  }

  const supabase = createSupabaseAdminClient();

  const { data: habilitacao } = await supabase
    .from("habilitacoes")
    .select("id, parceiro_id, conselho, numero, uf, validade, nome_no_registro, status")
    .eq("id", id)
    .maybeSingle();

  if (!habilitacao) return { error: "Habilitação não encontrada." };
  if (habilitacao.status === "aprovada") return { error: "Esta credencial já está aprovada." };

  // §5.1: divergência entre o nome do registro e o do cadastro reprova
  // automaticamente. Conferimos no servidor para que a aprovação manual não
  // consiga passar por cima da regra por descuido.
  const { data: perfil } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", habilitacao.parceiro_id)
    .maybeSingle();

  const normalizar = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

  if (
    !perfil ||
    normalizar(perfil.full_name as string) !== normalizar(habilitacao.nome_no_registro as string)
  ) {
    return {
      error: `Nome divergente: o cadastro diz "${perfil?.full_name ?? "—"}" e o registro diz "${habilitacao.nome_no_registro}". Divergência reprova automaticamente (política 07 §5.1).`,
    };
  }

  if (new Date(habilitacao.validade as string) < new Date()) {
    return { error: "A credencial enviada já está vencida — não pode ser aprovada." };
  }

  const agora = new Date().toISOString();
  const { error } = await supabase
    .from("habilitacoes")
    .update({
      status: "aprovada",
      verificada_em: agora,
      fonte_consultada: fonte,
      motivo_reprovacao: null,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe credencial aprovada deste conselho e UF para este parceiro." };
    }
    return { error: "Não foi possível aprovar agora." };
  }

  await supabase.from("audit_log").insert({
    actor_id: null,
    actor_role: "admin",
    action: "habilitacao.aprovada",
    target_table: "habilitacoes",
    target_id: id,
    metadata: {
      admin_email: admin,
      conselho: habilitacao.conselho,
      numero: habilitacao.numero,
      uf: habilitacao.uf,
      validade: habilitacao.validade,
      fonte_consultada: fonte,
    },
  });

  revalidatePath("/admin/habilitacoes");
  return { ok: "Credencial aprovada. O parceiro já pode atuar nas campanhas do segmento." };
}

export async function reprovarHabilitacao(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await getAdminEmail();
  if (!admin) return { error: "Sessão administrativa expirada." };

  const id = String(formData.get("habilitacaoId") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  const fonte = String(formData.get("fonteConsultada") ?? "").trim();

  if (!id) return { error: "Habilitação não informada." };
  if (motivo.length < 15) {
    return { error: "Descreva o motivo — o parceiro precisa saber o que corrigir para reenviar." };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("habilitacoes")
    .update({
      status: "reprovada",
      verificada_em: new Date().toISOString(),
      fonte_consultada: fonte || null,
      motivo_reprovacao: motivo,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível reprovar agora." };

  await supabase.from("audit_log").insert({
    actor_id: null,
    actor_role: "admin",
    action: "habilitacao.reprovada",
    target_table: "habilitacoes",
    target_id: id,
    metadata: { admin_email: admin, motivo, fonte_consultada: fonte || null },
  });

  revalidatePath("/admin/habilitacoes");
  return { ok: "Reprovação registrada. O parceiro foi informado e pode reenviar." };
}
