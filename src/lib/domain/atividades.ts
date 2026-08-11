/**
 * Regime regulatório por atividade do parceiro.
 *
 * Espelha `public.regime_atividade()` e `public.conselho_da_atividade()` da
 * migration 0021. As duas cópias existem de propósito: o banco é a autoridade
 * (CHECK constraint + trigger no INSERT de indicações) e esta cópia serve só
 * para a interface avisar antes de o usuário perder o formulário preenchido.
 * Mudou aqui, muda lá — e o teste de conformidade compara as duas.
 *
 * Política 07 §1: o que classifica a campanha é O QUE O PARCEIRO FAZ, não o
 * setor do cliente. Software para corretora é `indicacao_software`, não seguro.
 */

export const ATIVIDADES = [
  "indicacao_software",
  "indicacao_servico_b2b",
  "indicacao_produto_b2b",
  "intermediacao_seguros",
  "intermediacao_imobiliaria",
  "intermediacao_investimentos",
  "intermediacao_planos_saude",
  "credito_emprestimo",
  "consorcio",
] as const;

export type Atividade = (typeof ATIVIDADES)[number];

export type Regime = "livre" | "habilitacao" | "fechado";

export type Conselho = "susep" | "creci" | "cvm";

type AtividadeInfo = {
  label: string;
  /** O que o parceiro faz, em uma frase — mostrado no seletor da campanha. */
  descricao: string;
  regime: Regime;
  conselho: Conselho | null;
};

const ATIVIDADE_INFO: Record<Atividade, AtividadeInfo> = {
  indicacao_software: {
    label: "Indicação de software",
    descricao: "O parceiro apresenta um sistema e registra o interesse. Não intermedia o produto do cliente final.",
    regime: "livre",
    conselho: null,
  },
  indicacao_servico_b2b: {
    label: "Indicação de serviço B2B",
    descricao: "Agência, contabilidade, consultoria e afins vendidos a outras empresas.",
    regime: "livre",
    conselho: null,
  },
  indicacao_produto_b2b: {
    label: "Indicação de produto B2B",
    descricao: "Bem físico ou insumo vendido a outras empresas.",
    regime: "livre",
    conselho: null,
  },
  intermediacao_seguros: {
    label: "Intermediação de seguros",
    descricao: "O parceiro intermedia apólice — atividade privativa de corretor registrado.",
    regime: "habilitacao",
    conselho: "susep",
  },
  intermediacao_imobiliaria: {
    label: "Intermediação imobiliária",
    descricao: "O parceiro intermedia venda ou locação de imóvel — privativo de corretor inscrito.",
    regime: "habilitacao",
    conselho: "creci",
  },
  intermediacao_investimentos: {
    label: "Intermediação de investimentos",
    descricao: "Oferta de valores mobiliários — exige registro de assessor com vínculo a intermediário.",
    regime: "habilitacao",
    conselho: "cvm",
  },
  intermediacao_planos_saude: {
    label: "Intermediação de planos de saúde",
    descricao: "Comercialização de plano de saúde ou odontológico.",
    regime: "habilitacao",
    conselho: "susep",
  },
  credito_emprestimo: {
    label: "Crédito, empréstimo e meios de pagamento",
    descricao: "Correspondente bancário é contrato entre PJ e instituição financeira — não há credencial individual a apresentar.",
    regime: "fechado",
    conselho: null,
  },
  consorcio: {
    label: "Consórcio",
    descricao: "Operação privativa de administradora autorizada pelo BACEN.",
    regime: "fechado",
    conselho: null,
  },
};

export function infoAtividade(a: Atividade): AtividadeInfo {
  return ATIVIDADE_INFO[a];
}

export function regimeDaAtividade(a: Atividade): Regime {
  return ATIVIDADE_INFO[a].regime;
}

export function conselhoDaAtividade(a: Atividade): Conselho | null {
  return ATIVIDADE_INFO[a].conselho;
}

export function isAtividade(value: string): value is Atividade {
  return (ATIVIDADES as readonly string[]).includes(value);
}

export const CONSELHO_LABEL: Record<Conselho, string> = {
  susep: "SUSEP",
  creci: "CRECI",
  cvm: "CVM",
};

/** Por que o segmento está fechado — texto exibido quando a empresa tenta publicar. */
export const MOTIVO_SEGMENTO_FECHADO: Record<string, string> = {
  credito_emprestimo:
    "Correspondente bancário é contrato entre pessoa jurídica e instituição financeira (Res. CMN nº 4.935/2021). Não existe registro individual que o parceiro possa apresentar, então não há como abrir por credencial.",
  consorcio:
    "Consórcio é operação privativa de administradora autorizada pelo BACEN (Lei nº 11.795/2008).",
};

export const ATIVIDADES_ABERTAS: readonly Atividade[] = ATIVIDADES.filter(
  (a) => ATIVIDADE_INFO[a].regime !== "fechado",
);

/**
 * A plataforma não coleta registro no CORE. Ver política 07 §4 e a linha
 * vermelha nº 2 do AGENTS.md — é decisão deliberada, não campo esquecido.
 * Exportado como constante para que qualquer tentativa de "adicionar CORE"
 * esbarre nesta explicação antes.
 */
export const CORE_NAO_COLETADO =
  "O CORE não habilita segmento algum: ele registra o exercício da representação comercial autônoma (Lei nº 4.886/1965). Coletá-lo produziria prova de que os parceiros exercem representação comercial — enquadramento que este modelo evita. Ter ou não ter CORE não afeta o uso da plataforma.";
