import { formatCents } from "@/lib/format";
import { infoAtividade, type Atividade } from "@/lib/domain/atividades";

/**
 * Contrato de Campanha (documento 03), renderizado com os valores REAIS da
 * campanha no momento da adesão.
 *
 * Este texto é o que vai ser congelado e hasheado (ver `src/lib/aceite.ts`),
 * então ele não pode conter nada que mude entre a exibição e o aceite — nada
 * de data de hoje, contador ou valor derivado de sessão além do nome. Se o
 * texto exibido diferir em um caractere do texto gravado, o hash deixa de
 * provar o que a pessoa leu.
 */

export const VERSAO_CONTRATO = "1.0-rascunho";

export type DadosContrato = {
  titulo: string;
  produto: string;
  empresa_nome: string;
  atividade_parceiro: Atividade;
  comissao_cents: number;
  comissao_recorrente: boolean;
  publico_alvo: string;
  resultado_util: string;
  prazo_analise_dias: number;
  prazo_pagamento_dias: number;
  janela_atribuicao_dias: number;
  janela_estorno_dias: number;
  territorio_ufs: string[] | null;
};

export function montarContrato(c: DadosContrato, nomeParceiro: string): string {
  const atividade = infoAtividade(c.atividade_parceiro);
  const comissao = c.comissao_recorrente
    ? `${formatCents(c.comissao_cents)} por mês, enquanto o cliente permanecer ativo`
    : formatCents(c.comissao_cents);

  return `CONTRATO DE MEDIAÇÃO DE NEGÓCIOS — CAMPANHA
Versão do modelo: ${VERSAO_CONTRATO}
RASCUNHO NÃO REVISADO POR ADVOGADO.

PARTES
Empresa anunciante: ${c.empresa_nome}
Parceiro comercial autônomo: ${nomeParceiro}
Plataforma: Verita Select · DealBridge — licencia o software e registra os fatos. NÃO é parte desta relação comercial.

OBJETO
Campanha: ${c.titulo}
Produto: ${c.produto}
Atividade do parceiro: ${atividade.label}
Regime regulatório: ${atividade.regime}${atividade.conselho ? ` (credencial ${atividade.conselho.toUpperCase()} exigida e vigente)` : ""}
${c.territorio_ufs?.length ? `Território: ${c.territorio_ufs.join(", ")}\n` : ""}
NATUREZA DA RELAÇÃO
1. O parceiro atua de forma AUTÔNOMA (CLT art. 442-B). Não há vínculo empregatício, jornada, meta individual com sanção, exclusividade ou subordinação.
2. A atividade é de MEDIAÇÃO (Código Civil arts. 722 a 729). O parceiro APRESENTA e INDICA; ele não fecha contratos, não concede descontos e não recebe valores em nome da empresa.

REMUNERAÇÃO
3. Comissão por indicação aprovada: ${comissao}.
4. A comissão é paga DIRETAMENTE pela empresa ao parceiro. Nenhum valor transita pela plataforma.
5. O parceiro recebe o valor INTEGRAL. A plataforma não cobra nada dele — nem taxa, nem retenção, nem mensalidade.
6. Sendo o parceiro pessoa física, a empresa efetua as retenções legais na qualidade de fonte pagadora. Sendo pessoa jurídica, o pagamento fica condicionado à emissão de nota fiscal.

PÚBLICO E RESULTADO ÚTIL
7. Público-alvo: ${c.publico_alvo}
8. Resultado que gera comissão: ${c.resultado_util}
9. A empresa não pode recusar indicação por critério diverso do publicado neste item.

PRAZOS
10. Análise da indicação: ${c.prazo_analise_dias} dias. Vencido o prazo sem manifestação, a indicação é APROVADA TACITAMENTE e gera comissão.
11. Pagamento após a aprovação: ${c.prazo_pagamento_dias} dias, mais 2 dias úteis para a empresa registrar a liquidação na plataforma.
12. Janela de atribuição: ${c.janela_atribuicao_dias} dias contados do registro. Fechando o negócio dentro dela, a comissão é devida ainda que o parceiro já tenha encerrado a adesão.
13. Janela de estorno: ${c.janela_estorno_dias} dias, mediante prova, com 7 dias para o parceiro contestar.

ATRIBUIÇÃO
14. Vence o PRIMEIRO REGISTRO VÁLIDO, aferido pelo log da plataforma (data, hora e IP).
15. A indicação deve ser registrada ANTES do primeiro contato do lead com a empresa.
16. Alegação de lead preexistente exige prova documental datada de antes do registro; sem prova, é rejeitada.

DADOS PESSOAIS
17. A empresa é CONTROLADORA dos dados do lead. A plataforma é OPERADORA.
18. É vedado inserir dado sensível, dado de menor de 18 anos ou dado obtido de lista comprada ou base vazada.

ENCERRAMENTO
19. O parceiro pode encerrar a adesão a qualquer tempo, sem multa, aviso prévio ou justificativa.
20. Indicações já registradas permanecem válidas dentro da janela de atribuição.`;
}
