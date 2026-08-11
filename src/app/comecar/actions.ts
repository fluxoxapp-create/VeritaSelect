"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isValidCpf } from "@/lib/cpf";
import { isValidCnpj, hashDocumentNumber } from "@/lib/documento";
import { registrarAceite } from "@/lib/aceite";
import { logAuthEvent } from "@/lib/auth-audit";

type FormState = { error?: string; redirectTo?: string } | undefined;

const UF = /^[A-Z]{2}$/;

function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

/**
 * Versão dos termos aceitos no onboarding. Muda junto com o arquivo em
 * `juridico/` — o texto integral é congelado no aceite, então a versão serve
 * para agrupar, não para localizar o conteúdo.
 */
const VERSAO_TERMOS = "1.0-rascunho";

/**
 * Onboarding do parceiro: cria a linha em `parceiros` e promove o papel.
 *
 * O papel NÃO vem de user_metadata (que é o que o cliente mandou no cadastro).
 * A promoção acontece aqui, no servidor, e é auditada — mesma regra que valia
 * para organizadores no produto anterior.
 */
export async function criarParceiro(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const tipoPessoa = String(formData.get("tipoPessoa") ?? "pf");
  const documento = String(formData.get("documento") ?? "");
  const chavePix = String(formData.get("chavePix") ?? "").trim();
  const cidade = String(formData.get("cidade") ?? "").trim();
  const uf = String(formData.get("uf") ?? "").trim().toUpperCase();
  const aceitou = formData.get("aceite") === "on";

  if (tipoPessoa !== "pf" && tipoPessoa !== "pj") {
    return { error: "Escolha pessoa física ou jurídica." };
  }
  if (tipoPessoa === "pf" && !isValidCpf(documento)) {
    return { error: "CPF inválido." };
  }
  if (tipoPessoa === "pj" && !isValidCnpj(documento)) {
    return { error: "CNPJ inválido." };
  }
  if (uf && !UF.test(uf)) {
    return { error: "UF inválida — use a sigla de dois caracteres." };
  }
  if (!aceitou) {
    return { error: "É preciso aceitar os Termos de Uso do Parceiro para continuar." };
  }

  const documentoHash = await hashDocumentNumber(documento);
  const last4 = documento.replace(/\D/g, "").slice(-4);

  // O aceite vem antes da criação: se não conseguirmos congelar a prova, o
  // cadastro não acontece (convenção técnica 3).
  await registrarAceite({
    profileId: user.id,
    documentoTipo: "termos_parceiro",
    documentoVersao: VERSAO_TERMOS,
    conteudo: TEXTO_ACEITE_PARCEIRO,
  });

  const { error } = await supabase.from("parceiros").insert({
    id: user.id,
    tipo_pessoa: tipoPessoa,
    documento_hash: documentoHash,
    documento_last4: last4,
    chave_pix: chavePix || null,
    cidade: cidade || null,
    uf: uf || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Este documento já está cadastrado em outra conta de parceiro." };
    }
    return { error: "Não foi possível concluir o cadastro agora. Tente novamente." };
  }

  // Promoção de papel: exige service-role porque `protect_profile_fields`
  // bloqueia a troca de role por quem não é admin.
  const admin = createSupabaseAdminClient();
  await admin.from("profiles").update({ role: "parceiro" }).eq("id", user.id);

  await logAuthEvent({
    actorId: user.id,
    actorRole: "parceiro",
    action: "auth.sign_up",
    metadata: { onboarding: "parceiro", tipo_pessoa: tipoPessoa },
  });

  return { redirectTo: "/app" };
}

/**
 * Onboarding da empresa: cria `empresas` + o vínculo em `empresa_usuarios`.
 *
 * A empresa nasce com KYB não enviado. Ela só aparece publicamente — e só
 * pode publicar campanha — depois de aprovada, o que é decisão da equipe.
 */
export async function criarEmpresa(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const razaoSocial = String(formData.get("razaoSocial") ?? "").trim();
  const nomeFantasia = String(formData.get("nomeFantasia") ?? "").trim();
  const cnpj = String(formData.get("cnpj") ?? "").replace(/\D/g, "");
  const representanteNome = String(formData.get("representanteNome") ?? "").trim();
  const representanteCpf = String(formData.get("representanteCpf") ?? "");
  const emailContato = String(formData.get("emailContato") ?? "").trim().toLowerCase();
  const site = String(formData.get("site") ?? "").trim();
  const aceitou = formData.get("aceite") === "on";

  if (!razaoSocial || !nomeFantasia || !emailContato || !representanteNome) {
    return { error: "Preencha todos os campos obrigatórios." };
  }
  if (!isValidCnpj(cnpj)) {
    return { error: "CNPJ inválido. Confira os números digitados." };
  }
  if (!isValidCpf(representanteCpf)) {
    return { error: "CPF do representante legal inválido." };
  }
  if (!aceitou) {
    return { error: "É preciso aceitar os Termos de Uso da Empresa e o Anexo DPA para continuar." };
  }

  const representanteHash = await hashDocumentNumber(representanteCpf);

  await registrarAceite({
    profileId: user.id,
    documentoTipo: "termos_empresa",
    documentoVersao: VERSAO_TERMOS,
    conteudo: TEXTO_ACEITE_EMPRESA,
  });

  // Criação com service-role: a policy de insert em `empresas` não existe
  // para o papel `authenticated` justamente porque o tenant ainda não existe
  // no momento do insert — `minha_empresa_id()` retornaria null e nenhuma
  // policy poderia autorizar a própria criação.
  const admin = createSupabaseAdminClient();

  const base = slugify(nomeFantasia) || "empresa";
  const { data: empresa, error } = await admin
    .from("empresas")
    .insert({
      slug: `${base}-${cnpj.slice(0, 4)}`,
      razao_social: razaoSocial,
      nome_fantasia: nomeFantasia,
      cnpj,
      representante_legal_nome: representanteNome,
      representante_legal_cpf_hash: representanteHash,
      email_contato: emailContato,
      site: site || null,
    })
    .select("id")
    .single();

  if (error || !empresa) {
    if (error?.code === "23505") {
      return { error: "Já existe uma empresa cadastrada com este CNPJ." };
    }
    return { error: "Não foi possível cadastrar a empresa agora. Tente novamente." };
  }

  const { error: vinculoError } = await admin.from("empresa_usuarios").insert({
    empresa_id: empresa.id,
    profile_id: user.id,
    responsavel_pela_campanha: true,
  });

  if (vinculoError) {
    // Sem vínculo a empresa fica órfã e invisível para todos — remove para
    // não bloquear o CNPJ numa nova tentativa.
    await admin.from("empresas").delete().eq("id", empresa.id);
    return { error: "Não foi possível concluir o cadastro agora. Tente novamente." };
  }

  await admin.from("profiles").update({ role: "empresa" }).eq("id", user.id);

  await logAuthEvent({
    actorId: user.id,
    actorRole: "empresa",
    action: "auth.sign_up",
    metadata: { onboarding: "empresa", empresa_id: empresa.id },
  });

  return { redirectTo: "/empresa" };
}

/**
 * Texto congelado no aceite. É deliberadamente um resumo executivo com
 * ponteiro para o documento completo: quando a Fase 0 fechar e o advogado
 * devolver a versão revisada, o conteúdo integral de `juridico/02` passa a
 * ser renderizado aqui e a versão sobe para 1.0.
 */
const TEXTO_ACEITE_PARCEIRO = `TERMOS DE USO — PARCEIRO COMERCIAL AUTÔNOMO (versão ${VERSAO_TERMOS})

RASCUNHO NÃO REVISADO POR ADVOGADO.

1. Você atua como parceiro comercial AUTÔNOMO. Não há vínculo empregatício, jornada, meta individual, exclusividade ou subordinação (CLT art. 442-B).
2. Sua atividade é de MEDIAÇÃO (Código Civil arts. 722 a 729): você indica clientes. Você não fecha contratos, não concede descontos e não recebe valores em nome da empresa.
3. A comissão é paga DIRETAMENTE PELA EMPRESA a você. A Verita Select não custodia, não intermedia e não repassa recursos.
4. A plataforma é GRATUITA para você. Não há taxa, retenção, mensalidade ou tarifa cobrada do parceiro sobre comissões.
5. A indicação deve ser registrada ANTES do primeiro contato do lead com a empresa. O primeiro registro válido vence em caso de duplicidade.
6. Campanhas de segmento regulado exigem credencial profissional verificada e vigente.
7. Você é responsável pelos dados pessoais de leads que inserir, que ficam sob controle da empresa anunciante.`;

const TEXTO_ACEITE_EMPRESA = `TERMOS DE USO — EMPRESA CONTRATANTE (versão ${VERSAO_TERMOS})

RASCUNHO NÃO REVISADO POR ADVOGADO.

1. A Verita Select licencia software de intermediação. Ela não é parte da relação comercial entre você e os parceiros.
2. Você paga a comissão DIRETAMENTE ao parceiro. A plataforma cobra apenas de você, em fatura mensal separada, valor fixo por indicação aprovada.
3. APROVAÇÃO TÁCITA: vencido o prazo de análise sem manifestação, a indicação é automaticamente aprovada e gera comissão e taxa. Você é avisado 3 dias antes do vencimento.
4. A recusa exige motivo de lista fechada e prova. Recusa genérica é inválida e devolve a indicação para análise.
5. Você não pode exercer poder de direção sobre o parceiro: nada de jornada, meta individual com sanção, exclusividade ou disciplina.
6. ANTI-DESINTERMEDIAÇÃO: a taxa é devida por 12 meses sobre negócio nascido de aproximação na plataforma, ainda que fechado fora dela (Código Civil art. 727).
7. Você é CONTROLADORA dos dados pessoais dos leads; a Verita Select é OPERADORA, nos termos do Anexo DPA (art. 39 da LGPD).`;
