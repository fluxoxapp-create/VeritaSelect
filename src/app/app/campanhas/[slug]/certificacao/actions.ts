"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireParceiro } from "@/lib/auth/session";

type FormState = { error?: string; ok?: string; acertos?: number; total?: number; erradas?: string[] } | undefined;

/**
 * Correção do questionário de certificação.
 *
 * A correção roda inteiramente no servidor, pelo cliente service-role: o
 * gabarito (`certificacao_alternativas.correta`) não é concedido ao papel
 * `authenticated` (migration 0023 §4), então não existe caminho pelo qual o
 * parceiro leia a resposta certa antes de responder.
 *
 * A promoção de `adesoes.certificacao` para 'aprovada' também é feita aqui, e
 * não pelo cliente do usuário: a 0023 §5 revogou essa coluna do papel
 * `authenticated` justamente porque quem pode se auto-certificar não precisa
 * responder ao questionário.
 *
 * ⚖️ Tentativa sem acerto total NÃO reprova: a adesão continua 'pendente' e
 * uma nova tentativa fica disponível na hora, sem espera. Ver
 * `src/lib/domain/certificacao.ts` para o porquê.
 */
export async function enviarQuestionario(_prev: FormState, formData: FormData): Promise<FormState> {
  const sessao = await requireParceiro();
  const adesaoId = String(formData.get("adesaoId") ?? "");
  if (!adesaoId) return { error: "Adesão não informada." };

  const supabase = await createSupabaseServerClient();

  // A policy "parceiro gerencia as proprias adesoes" restringe o alcance; o
  // filtro por parceiro_id é redundância explícita, não a defesa.
  const { data: adesao } = await supabase
    .from("adesoes")
    .select("id, status, certificacao, campanha_id, campanhas(slug, exige_certificacao)")
    .eq("id", adesaoId)
    .eq("parceiro_id", sessao.userId)
    .maybeSingle();

  const registro = adesao as unknown as
    | {
        id: string;
        status: string;
        certificacao: string;
        campanha_id: string;
        campanhas: { slug: string; exige_certificacao: boolean } | null;
      }
    | null;

  if (!registro) return { error: "Adesão não encontrada." };
  if (registro.status !== "ativa") return { error: "Esta adesão está encerrada." };
  if (!registro.campanhas?.exige_certificacao) {
    return { error: "Esta campanha não exige certificação de produto." };
  }
  if (registro.certificacao === "aprovada") {
    return { error: "Você já concluiu a certificação desta campanha." };
  }

  const admin = createSupabaseAdminClient();

  const { data: questoesData } = await admin
    .from("certificacao_questoes")
    .select("id, ordem, certificacao_alternativas(id, correta)")
    .eq("campanha_id", registro.campanha_id)
    .eq("ativa", true)
    .order("ordem");

  const questoes = (questoesData ?? []) as unknown as {
    id: string;
    ordem: number;
    certificacao_alternativas: { id: string; correta: boolean }[];
  }[];

  if (questoes.length === 0) {
    return { error: "Esta campanha ainda não tem questionário publicado. Fale com o suporte." };
  }

  // Toda questão precisa de resposta: questionário parcial não demonstra
  // conhecimento do produto, que é a única justificativa do portão.
  const escolhas = new Map<string, string>();
  for (const q of questoes) {
    const escolhida = String(formData.get(`q_${q.id}`) ?? "");
    if (!escolhida) return { error: "Responda todas as questões antes de enviar." };
    // A alternativa precisa pertencer à questão — sem isso, um id forjado no
    // formulário poderia apontar para alternativa de outra questão.
    if (!q.certificacao_alternativas.some((a) => a.id === escolhida)) {
      return { error: "Resposta inválida. Recarregue a página e tente de novo." };
    }
    escolhas.set(q.id, escolhida);
  }

  const erradas: string[] = [];
  for (const q of questoes) {
    const escolhida = escolhas.get(q.id)!;
    const correta = q.certificacao_alternativas.find((a) => a.correta)?.id;
    if (escolhida !== correta) erradas.push(q.id);
  }

  const total = questoes.length;
  const acertos = total - erradas.length;
  const aprovada = erradas.length === 0;

  const { data: tentativa, error: tentativaError } = await admin
    .from("certificacao_tentativas")
    .insert({
      adesao_id: registro.id,
      parceiro_id: sessao.userId,
      concluida_em: new Date().toISOString(),
      acertos,
      total,
      aprovada,
    })
    .select("id")
    .single();

  if (tentativaError || !tentativa) {
    return { error: "Não foi possível registrar suas respostas agora. Tente novamente." };
  }

  await admin.from("certificacao_respostas").insert(
    questoes.map((q) => ({
      tentativa_id: tentativa.id,
      questao_id: q.id,
      alternativa_id: escolhas.get(q.id)!,
    })),
  );

  if (aprovada) {
    const { error: promoErro } = await admin
      .from("adesoes")
      .update({ certificacao: "aprovada" })
      .eq("id", registro.id)
      .eq("parceiro_id", sessao.userId);

    if (promoErro) {
      return { error: "Suas respostas foram registradas, mas a liberação falhou. Recarregue a página." };
    }

    await admin.from("audit_log").insert({
      actor_id: sessao.userId,
      actor_role: "parceiro",
      action: "certificacao.aprovada",
      target_table: "adesoes",
      target_id: registro.id,
      metadata: { campanha_id: registro.campanha_id, tentativa_id: tentativa.id, acertos, total },
    });
  }

  revalidatePath("/app/campanhas");
  revalidatePath(`/app/campanhas/${registro.campanhas.slug}/certificacao`);

  if (aprovada) {
    return { ok: "Certificação concluída. Você já pode registrar indicações nesta campanha.", acertos, total };
  }

  return {
    error: `Você acertou ${acertos} de ${total}. Reveja o material e responda de novo — não há limite de tentativas nem espera.`,
    acertos,
    total,
    erradas,
  };
}
