import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Documentos jurídicos publicados a partir dos arquivos de `juridico/`.
 *
 * Fonte única: o que o advogado revisar naqueles arquivos é exatamente o que
 * o usuário lê no site. Manter uma segunda cópia em JSX garantiria que as
 * duas divergissem na primeira revisão.
 *
 * Isto NÃO substitui o motor de aceite (`src/lib/aceite.ts`): no aceite, o
 * texto é congelado e hasheado naquele instante, porque apontar para o
 * arquivo vivo não prova o que a pessoa leu.
 */

export type SlugDocumento =
  | "empresa"
  | "parceiro"
  | "campanha"
  | "privacidade"
  | "dpa"
  | "comissionamento"
  | "habilitacao";

type Documento = {
  arquivo: string;
  titulo: string;
  resumo: string;
  /** Ainda não revisado por advogado — Fase 0 aberta. */
  rascunho: boolean;
};

export const DOCUMENTOS: Record<SlugDocumento, Documento> = {
  empresa: {
    arquivo: "01-termos-de-uso-empresa.md",
    titulo: "Termos de Uso — Empresa",
    resumo:
      "O que a empresa aceita ao publicar campanhas: aprovação tácita, recusa com prova, anti-desintermediação e a proibição de exercer poder de direção sobre o parceiro.",
    rascunho: true,
  },
  parceiro: {
    arquivo: "02-termos-de-uso-parceiro.md",
    titulo: "Termos de Uso — Parceiro",
    resumo:
      "O que o parceiro aceita: atuação autônoma sem vínculo, mediação e não fechamento de negócio, registro prévio da indicação e gratuidade total da plataforma.",
    rascunho: true,
  },
  campanha: {
    arquivo: "03-contrato-de-campanha.md",
    titulo: "Contrato de Campanha",
    resumo:
      "Modelo gerado pelo sistema no momento da adesão, congelado e hasheado com IP e timestamp.",
    rascunho: true,
  },
  privacidade: {
    arquivo: "04-politica-de-privacidade.md",
    titulo: "Política de Privacidade",
    resumo:
      "Que dados tratamos, com que base legal e por quanto tempo. Dados de lead são da empresa anunciante — nós somos operadores.",
    rascunho: true,
  },
  dpa: {
    arquivo: "05-anexo-dpa.md",
    titulo: "Anexo DPA",
    resumo:
      "Acordo de tratamento de dados pessoais entre a empresa (controladora) e a plataforma (operadora), nos termos do art. 39 da LGPD.",
    rascunho: true,
  },
  comissionamento: {
    arquivo: "06-politica-comissionamento-disputas.md",
    titulo: "Política de Comissionamento e Disputas",
    resumo:
      "Ciclo de vida da indicação, regras de atribuição, prazos, estorno, escala de inadimplência e o procedimento de disputa.",
    rascunho: true,
  },
  habilitacao: {
    arquivo: "07-politica-de-habilitacao.md",
    titulo: "Política de Habilitação Profissional",
    resumo:
      "Quais segmentos exigem credencial, quais permanecem fechados e por que a plataforma não coleta registro no CORE.",
    rascunho: true,
  },
};

export function isSlugDocumento(valor: string): valor is SlugDocumento {
  return valor in DOCUMENTOS;
}

export async function lerDocumento(slug: SlugDocumento): Promise<string> {
  const caminho = join(process.cwd(), "juridico", DOCUMENTOS[slug].arquivo);
  return readFile(caminho, "utf8");
}
