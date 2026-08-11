/**
 * Ciclo de vida da indicação — política 06 §2, §4 e §10.
 *
 * Espelha os enums `indicacao_status` e `motivo_recusa` da migration 0021.
 */

export const INDICACAO_STATUS = [
  "registrada",
  "em_analise",
  "aprovada",
  "paga",
  "recusada",
  "em_disputa",
  "estornada",
  "expirada",
] as const;

export type IndicacaoStatus = (typeof INDICACAO_STATUS)[number];

type StatusInfo = {
  label: string;
  /** Significado, na linguagem do contrato — vira tooltip e legenda. */
  significado: string;
  tom: "neutro" | "espera" | "ok" | "erro";
};

export const STATUS_INFO: Record<IndicacaoStatus, StatusInfo> = {
  registrada: {
    label: "Registrada",
    significado: "Carimbo de tempo gerado. É esta marca que decide a atribuição se dois parceiros indicarem o mesmo lead.",
    tom: "neutro",
  },
  em_analise: {
    label: "Em análise",
    significado: "A empresa está avaliando dentro do prazo da campanha.",
    tom: "espera",
  },
  aprovada: {
    label: "Aprovada",
    significado: "A empresa reconheceu o resultado útil. Gera direito à comissão e à taxa da plataforma.",
    tom: "ok",
  },
  paga: {
    label: "Paga",
    significado: "A empresa pagou o parceiro diretamente e registrou a liquidação aqui.",
    tom: "ok",
  },
  recusada: {
    label: "Recusada",
    significado: "Recusa com motivo da lista fechada. O parceiro tem 7 dias para contestar.",
    tom: "erro",
  },
  em_disputa: {
    label: "Em disputa",
    significado: "Contestação aberta. Decisão administrativa em até 10 dias úteis.",
    tom: "espera",
  },
  estornada: {
    label: "Estornada",
    significado: "Comissão devolvida dentro da janela de estorno. A taxa da plataforma é estornada junto.",
    tom: "erro",
  },
  expirada: {
    label: "Expirada",
    significado: "A janela de atribuição venceu sem negócio fechado.",
    tom: "neutro",
  },
};

/**
 * Motivos de recusa — lista FECHADA (política 06 §4.1). Recusa fora desta
 * lista, ou sem a prova exigida, é inválida: a indicação volta para análise
 * com prazo reduzido de 5 dias (§4.3).
 */
export const MOTIVOS_RECUSA = [
  "lead_preexistente",
  "contato_invalido",
  "fora_do_publico_alvo",
  "resultado_util_nao_configurado",
  "indicacao_duplicada",
  "suspeita_de_fraude",
] as const;

export type MotivoRecusa = (typeof MOTIVOS_RECUSA)[number];

export const MOTIVO_RECUSA_INFO: Record<MotivoRecusa, { label: string; prova: string }> = {
  lead_preexistente: {
    label: "Lead já existia na base",
    prova: "Prova documental DATADA DE ANTES do registro (print de CRM com data, e-mail, contrato). Alegação sem prova é rejeitada e a indicação segue para aprovação.",
  },
  contato_invalido: {
    label: "Dados de contato inválidos ou inexistentes",
    prova: "Registro da tentativa de contato — retorno de e-mail, número inexistente.",
  },
  fora_do_publico_alvo: {
    label: "Fora do público-alvo da campanha",
    prova: "Referência ao critério publicado na campanha no momento da adesão.",
  },
  resultado_util_nao_configurado: {
    label: "Resultado útil não configurado",
    prova: "Demonstração de que o resultado definido na campanha não ocorreu (ex.: reunião não aconteceu).",
  },
  indicacao_duplicada: {
    label: "Indicação duplicada",
    prova: "Referência ao registro anterior.",
  },
  suspeita_de_fraude: {
    label: "Suspeita de fraude",
    prova: "Descrição fundamentada dos indícios.",
  },
};

/** Prazos padrão e limites — política 06 §10. A campanha não publica fora deles. */
export const PRAZOS = {
  analise: { padrao: 15, min: 3, max: 30, label: "Análise da indicação" },
  pagamento: { padrao: 15, min: 1, max: 30, label: "Pagamento após aprovação" },
  atribuicao: { padrao: 90, min: 30, max: 180, label: "Janela de atribuição" },
  estorno: { padrao: 30, min: 7, max: 60, label: "Janela de estorno" },
} as const;

export type PrazoChave = keyof typeof PRAZOS;

export function prazoValido(chave: PrazoChave, dias: number): boolean {
  const p = PRAZOS[chave];
  return Number.isInteger(dias) && dias >= p.min && dias <= p.max;
}

/** Prazos fixos que não variam por campanha. */
export const PRAZOS_FIXOS = {
  contestacaoParceiroDias: 7,
  respostaEmpresaDias: 5,
  decisaoPlataformaDiasUteis: 10,
  registroLiquidacaoDiasUteis: 2,
  avisoAntesDoVencimentoDias: 3,
} as const;

/**
 * Escala de sanção por atraso de pagamento — política 06 §5.5. A consequência
 * é da PLATAFORMA contra a empresa (pausar, sinalizar, suspender); em nenhum
 * momento a plataforma retém ou repassa valor.
 */
export const ESCALA_INADIMPLENCIA = [
  { dias: 1, consequencia: "Notificação automática à empresa" },
  { dias: 5, consequencia: "Campanhas pausadas para novas adesões" },
  { dias: 10, consequencia: "Selo público de pendência de pagamento no perfil" },
  { dias: 15, consequencia: "Campanhas removidas e conta suspensa" },
  { dias: 30, consequencia: "Encerramento da conta; débito informado ao parceiro para cobrança direta" },
] as const;
