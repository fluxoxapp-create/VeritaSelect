/**
 * Certificação de produto — Fase 3 do roadmap.
 *
 * ⚖️ Isto NÃO é treinamento obrigatório. A diferença decide um processo
 * trabalhista: exigir treinamento, com nota e reprovação, é indício de
 * subordinação (CLT art. 3º) e contradiz a linha vermelha nº 1. O que a
 * plataforma exige é que quem vai APRESENTAR um produto a terceiros conheça
 * esse produto — interesse de qualidade da informação ao cliente final.
 *
 * As regras abaixo existem para manter essa distinção de pé. Mexer nelas
 * (adicionar prazo, limitar tentativas, expor nota comparável) reintroduz
 * exatamente o indício que elas removem — passe pelo `guardiao-juridico`
 * antes.
 */

/** Acerto total. Não é rigor: é o que evita nota — ou se sabe, ou se revê. */
export const EXIGE_ACERTO_TOTAL = true;

/**
 * Tentativas ilimitadas e sem espera entre elas. Bloquear por erro seria
 * sanção disciplinar aplicada pela plataforma a um autônomo.
 */
export const TENTATIVAS_ILIMITADAS = true;

/**
 * Não existe prazo para concluir. Prazo para "se capacitar" é jornada
 * disfarçada — e a adesão não caduca por não certificar.
 */
export const PRAZO_PARA_CONCLUIR = null;

export const MIN_QUESTOES = 3;
export const MIN_ALTERNATIVAS = 2;

export type CertificacaoStatus = "nao_exigida" | "pendente" | "aprovada" | "reprovada";

/**
 * Texto exibido ao parceiro em cada estado. O vocabulário aqui é o do
 * AGENTS.md: "certificação de produto", "questionário", "material". Nunca
 * "prova", "curso", "aluno", "nota" ou "reprovado".
 */
export const CERTIFICACAO_INFO: Record<
  CertificacaoStatus,
  { label: string; significado: string; tom: "neutro" | "espera" | "ok" | "erro" }
> = {
  nao_exigida: {
    label: "Sem certificação",
    significado: "Esta campanha não pede certificação de produto. Você já pode indicar.",
    tom: "neutro",
  },
  pendente: {
    label: "Certificação pendente",
    significado:
      "Revise o material e responda ao questionário para começar a indicar nesta campanha. Sem prazo e sem limite de tentativas.",
    tom: "espera",
  },
  aprovada: {
    label: "Certificado",
    significado: "Você concluiu a certificação de produto desta campanha.",
    tom: "ok",
  },
  reprovada: {
    label: "Certificação pendente",
    significado:
      "Estado legado — este fluxo não reprova ninguém. Uma tentativa sem acerto total mantém a certificação pendente e libera nova tentativa.",
    tom: "espera",
  },
};

/**
 * Aptidão do parceiro PARA UMA CAMPANHA. São dois portões independentes que
 * a interface costuma confundir:
 *
 *   habilitação → credencial profissional do segmento regulado (política 07)
 *   certificação → conhecimento do produto daquela campanha
 *
 * Uma não substitui a outra: corretor com CRECI vigente ainda precisa
 * conhecer o produto, e conhecer o produto não dispensa o CRECI.
 */
export type MotivoInapto = "adesao_encerrada" | "certificacao_pendente" | "habilitacao_ausente";

export type Aptidao = {
  apto: boolean;
  motivos: MotivoInapto[];
};

export const MOTIVO_INAPTO_INFO: Record<MotivoInapto, { label: string; comoResolver: string; href?: string }> = {
  adesao_encerrada: {
    label: "Adesão encerrada",
    comoResolver: "Adira novamente à campanha para voltar a indicar.",
  },
  certificacao_pendente: {
    label: "Certificação de produto pendente",
    comoResolver: "Revise o material e responda ao questionário — sem prazo e sem limite de tentativas.",
  },
  habilitacao_ausente: {
    label: "Credencial profissional ausente, vencida ou não aprovada",
    comoResolver: "Envie a credencial do conselho exigido pelo segmento e aguarde a verificação.",
    href: "/app/habilitacao",
  },
};

export function avaliarAptidao(params: {
  adesaoAtiva: boolean;
  certificacao: CertificacaoStatus;
  exigeHabilitacao: boolean;
  habilitacaoVigente: boolean;
}): Aptidao {
  const motivos: MotivoInapto[] = [];

  if (!params.adesaoAtiva) motivos.push("adesao_encerrada");
  // 'reprovada' entra aqui junto de 'pendente' de propósito: não é estado
  // terminal, é "ainda falta" — ver comentário do enum acima.
  if (params.certificacao === "pendente" || params.certificacao === "reprovada") {
    motivos.push("certificacao_pendente");
  }
  if (params.exigeHabilitacao && !params.habilitacaoVigente) {
    motivos.push("habilitacao_ausente");
  }

  return { apto: motivos.length === 0, motivos };
}
