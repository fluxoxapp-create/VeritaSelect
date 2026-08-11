"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireParceiro } from "@/lib/auth/session";
import { faixaEValorDaTaxa } from "@/lib/data/faixas";

type FormState = { error?: string; redirectTo?: string } | undefined;

async function clientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip");
}

/**
 * Registro de indicação — o ato central do produto.
 *
 * Três coisas acontecem aqui e nenhuma delas é opcional:
 *
 * 1. CARIMBO DE TEMPO. `registrada_em` e `registrada_ip` são a prova de
 *    atribuição. Se dois parceiros indicarem o mesmo lead, vence o primeiro
 *    registro válido (política 06 §3.1) — e é este registro que decide.
 *
 * 2. CONGELAMENTO. Comissão e faixa de taxa são copiadas da campanha AGORA
 *    (convenção técnica 2). Alteração posterior da campanha não alcança esta
 *    indicação — nem para mais, nem para menos.
 *
 * 3. PORTÃO DE HABILITAÇÃO. O trigger `indicacoes_valida_habilitacao` recusa
 *    o INSERT se a campanha for de segmento regulado e o parceiro não tiver
 *    credencial aprovada e vigente. A validação vive no banco de propósito:
 *    é a única camada que nenhuma rota consegue contornar por engano.
 */
export async function registrarIndicacao(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const sessao = await requireParceiro();

  const adesaoId = String(formData.get("adesaoId") ?? "");
  const leadEmpresaNome = String(formData.get("leadEmpresaNome") ?? "").trim();
  const leadCnpj = String(formData.get("leadCnpj") ?? "").replace(/\D/g, "");
  const leadContatoNome = String(formData.get("leadContatoNome") ?? "").trim();
  const leadContatoCargo = String(formData.get("leadContatoCargo") ?? "").trim();
  const leadContatoEmail = String(formData.get("leadContatoEmail") ?? "").trim().toLowerCase();
  const leadContatoTelefone = String(formData.get("leadContatoTelefone") ?? "").trim();
  const origemDoDado = String(formData.get("origemDoDado") ?? "").trim();
  const observacoes = String(formData.get("observacoes") ?? "").trim();
  const confirmaRegistroPrevio = formData.get("registroPrevio") === "on";

  if (!adesaoId) return { error: "Escolha a campanha." };
  if (!leadEmpresaNome || !leadContatoNome) {
    return { error: "Informe ao menos a empresa e o nome do contato." };
  }
  if (!leadContatoEmail && !leadContatoTelefone) {
    return { error: "Informe e-mail ou telefone — sem contato a empresa não consegue avaliar." };
  }
  if (leadCnpj && leadCnpj.length !== 14) {
    return { error: "CNPJ do lead inválido. Deixe em branco se não souber." };
  }
  // Sustenta o legítimo interesse do art. 10 da LGPD — sem isso, o dado do
  // lead entra no sistema sem base declarada.
  if (origemDoDado.length < 5) {
    return {
      error:
        "Diga de onde veio o contato (ex.: 'site da empresa', 'evento X', 'indicação de cliente'). É o que sustenta a base legal do tratamento.",
    };
  }
  // Política 06 §3.3 — registro posterior a contato já iniciado não gera comissão.
  if (!confirmaRegistroPrevio) {
    return {
      error:
        "Confirme que o lead ainda não teve contato com a empresa. Registro posterior a um contato já iniciado não gera comissão.",
    };
  }

  const supabase = await createSupabaseServerClient();

  // A adesão é buscada pelo próprio parceiro: a policy de `adesoes` impede
  // que este id seja de outra pessoa, então não há IDOR a checar aqui.
  const { data: adesao } = await supabase
    .from("adesoes")
    .select(
      "id, status, certificacao, campanha_id, campanhas(id, empresa_id, status, comissao_cents, prazo_analise_dias, janela_atribuicao_dias)",
    )
    .eq("id", adesaoId)
    .eq("parceiro_id", sessao.userId)
    .maybeSingle();

  if (!adesao) return { error: "Adesão não encontrada." };
  if (adesao.status !== "ativa") return { error: "Esta adesão está encerrada." };
  if (adesao.certificacao === "pendente") {
    return { error: "Conclua a certificação de produto desta campanha antes de indicar." };
  }

  const campanha = adesao.campanhas as unknown as {
    id: string;
    empresa_id: string;
    status: string;
    comissao_cents: number;
    prazo_analise_dias: number;
    janela_atribuicao_dias: number;
  } | null;

  if (!campanha) return { error: "Campanha não encontrada." };
  if (campanha.status !== "publicada") {
    return { error: "Esta campanha não está aceitando novas indicações." };
  }

  const agora = new Date();
  const prazoAnalise = new Date(agora);
  prazoAnalise.setDate(prazoAnalise.getDate() + campanha.prazo_analise_dias);
  const janelaAtribuicao = new Date(agora);
  janelaAtribuicao.setDate(janelaAtribuicao.getDate() + campanha.janela_atribuicao_dias);

  const { faixaId, taxaCents } = await faixaEValorDaTaxa(campanha.comissao_cents);

  const { data: criada, error } = await supabase
    .from("indicacoes")
    .insert({
      campanha_id: campanha.id,
      parceiro_id: sessao.userId,
      empresa_id: campanha.empresa_id,
      adesao_id: adesao.id,
      lead_empresa_nome: leadEmpresaNome,
      lead_cnpj: leadCnpj || null,
      lead_contato_nome: leadContatoNome,
      lead_contato_cargo: leadContatoCargo || null,
      lead_contato_email: leadContatoEmail || null,
      lead_contato_telefone: leadContatoTelefone || null,
      origem_do_dado: origemDoDado,
      observacoes: observacoes || null,
      status: "registrada",
      comissao_cents: campanha.comissao_cents,
      faixa_taxa_id: faixaId,
      taxa_cents: taxaCents,
      registrada_em: agora.toISOString(),
      registrada_ip: await clientIp(),
      prazo_analise_em: prazoAnalise.toISOString(),
      janela_atribuicao_ate: janelaAtribuicao.toISOString(),
    })
    .select("id")
    .single();

  if (error || !criada) {
    // 23505 = colisão em um dos índices de deduplicação (CNPJ → e-mail →
    // telefone → nome normalizado). Não revelamos QUEM registrou antes: isso
    // exporia a carteira de outro parceiro.
    if (error?.code === "23505") {
      return {
        error:
          "Este lead já está registrado nesta campanha por outro parceiro. Vale o primeiro registro válido.",
      };
    }
    // A mensagem do trigger de habilitação é escrita para ser lida.
    if (error?.message?.includes("habilitação")) {
      return {
        error:
          "Sua credencial para este segmento está ausente, reprovada ou vencida. Regularize em Habilitação para voltar a registrar indicações aqui.",
      };
    }
    if (error?.message?.includes("segmento fechado")) {
      return { error: "Esta campanha é de segmento fechado e não aceita indicações." };
    }
    return { error: "Não foi possível registrar agora. Tente novamente." };
  }

  const admin = createSupabaseAdminClient();
  await Promise.all([
    admin.from("indicacao_eventos").insert({
      indicacao_id: criada.id,
      de_status: null,
      para_status: "registrada",
      ator_id: sessao.userId,
      ator_papel: "parceiro",
      automatico: false,
    }),
    admin.from("audit_log").insert({
      actor_id: sessao.userId,
      actor_role: "parceiro",
      action: "indicacao.registrada",
      target_table: "indicacoes",
      target_id: criada.id,
      metadata: {
        campanha_id: campanha.id,
        comissao_cents: campanha.comissao_cents,
        taxa_cents: taxaCents,
      },
    }),
  ]);

  revalidatePath("/app/indicacoes");
  revalidatePath("/app");
  return { redirectTo: "/app/indicacoes" };
}
