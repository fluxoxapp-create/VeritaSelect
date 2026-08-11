"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireParceiro } from "@/lib/auth/session";
import { PRAZOS_FIXOS } from "@/lib/domain/indicacoes";

type FormState = { error?: string; redirectTo?: string } | undefined;

/**
 * Contestação da recusa ou do estorno — política 06 §7.
 *
 * O parceiro tem 7 dias a partir da decisão da empresa. A empresa tem 5 dias
 * para responder; o silêncio dela implica procedência da contestação. A
 * decisão da plataforma é administrativa e não vinculante: nenhuma das partes
 * renuncia ao acesso ao Judiciário.
 *
 * Os prazos da disputa NÃO são calculados aqui: o trigger
 * `disputas_calcula_prazos` (migration 0022) os carimba com o relógio do
 * servidor. Quem abre a disputa não escolhe quanto tempo a outra parte tem.
 */
export async function abrirDisputa(_prev: FormState, formData: FormData): Promise<FormState> {
  const sessao = await requireParceiro();
  const indicacaoId = String(formData.get("indicacaoId") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!indicacaoId) return { error: "Indicação não informada." };
  if (motivo.length < 30) {
    return {
      error:
        "Descreva sua contestação com pelo menos 30 caracteres. Aponte fatos e datas — o log da plataforma é a prova de maior peso, então cite o que ele mostra.",
    };
  }

  const supabase = await createSupabaseServerClient();

  // A policy `parceiro le as proprias indicacoes` impede que este id seja de
  // outra pessoa — não há IDOR a checar manualmente.
  const { data: indicacao } = await supabase
    .from("indicacoes")
    .select("id, status, analisada_em, estornada_em")
    .eq("id", indicacaoId)
    .eq("parceiro_id", sessao.userId)
    .maybeSingle();

  if (!indicacao) return { error: "Indicação não encontrada." };
  if (indicacao.status !== "recusada" && indicacao.status !== "estornada") {
    return { error: "Só é possível contestar recusa ou estorno." };
  }

  // Prazo de 7 dias contados da decisão da empresa.
  const referencia = indicacao.estornada_em ?? indicacao.analisada_em;
  if (referencia) {
    const limite = new Date(referencia as string);
    limite.setDate(limite.getDate() + PRAZOS_FIXOS.contestacaoParceiroDias);
    if (new Date() > limite) {
      return {
        error: `O prazo de ${PRAZOS_FIXOS.contestacaoParceiroDias} dias para contestar já venceu. Isso não impede a cobrança pelas vias próprias — peça o conjunto probatório pelo canal de contato.`,
      };
    }
  }

  const { data: disputa, error } = await supabase
    .from("disputas")
    .insert({
      indicacao_id: indicacaoId,
      aberta_por: sessao.userId,
      motivo,
    })
    .select("id")
    .single();

  if (error || !disputa) {
    if (error?.code === "23505") return { error: "Já existe uma disputa aberta para esta indicação." };
    return { error: "Não foi possível abrir a contestação agora. Tente novamente." };
  }

  // O parceiro NÃO tem policy de update em `indicacoes` — e não deve ter: é a
  // tabela de fronteira entre os dois tenants. Sem RLS que o alcance, o update
  // pelo cliente do usuário atingiria zero linhas e voltaria SEM erro, dando
  // uma disputa aberta sobre uma indicação que continua "recusada". A troca de
  // status é ato da máquina de estados, então vai pelo cliente admin, preso ao
  // id e ao status que acabamos de ler.
  const admin = createSupabaseAdminClient();
  const { data: movidas, error: statusError } = await admin
    .from("indicacoes")
    .update({ status: "em_disputa" })
    .eq("id", indicacaoId)
    .eq("parceiro_id", sessao.userId)
    .eq("status", indicacao.status)
    .select("id");

  if (statusError || !movidas?.length) {
    // A disputa já existe; deixá-la órfã de status esconderia o fato dos dois
    // lados. Desfazemos para que o parceiro possa tentar de novo.
    await admin.from("disputas").delete().eq("id", disputa.id);
    return { error: "Não foi possível abrir a contestação agora. Tente novamente." };
  }

  await Promise.all([
    admin.from("indicacao_eventos").insert({
      indicacao_id: indicacaoId,
      de_status: indicacao.status,
      para_status: "em_disputa",
      ator_id: sessao.userId,
      ator_papel: "parceiro",
      automatico: false,
      observacao: motivo,
    }),
    admin.from("audit_log").insert({
      actor_id: sessao.userId,
      actor_role: "parceiro",
      action: "disputa.aberta",
      target_table: "disputas",
      target_id: disputa.id,
      metadata: { indicacao_id: indicacaoId, de_status: indicacao.status },
    }),
  ]);

  revalidatePath("/app/indicacoes");
  revalidatePath("/empresa/disputas");
  return { redirectTo: "/app/indicacoes?status=em_disputa" };
}
