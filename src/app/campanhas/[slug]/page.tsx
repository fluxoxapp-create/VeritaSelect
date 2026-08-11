import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Card, Pill, Campo, BotaoLink, AvisoFase0 } from "@/components/ui";
import { buscarCampanhaPublica, minhaAdesao } from "@/lib/data/campanhas";
import { getSessao } from "@/lib/auth/session";
import { formatComissao, formatCents } from "@/lib/format";
import { infoAtividade, CONSELHO_LABEL } from "@/lib/domain/atividades";
import { PRAZOS_FIXOS } from "@/lib/domain/indicacoes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const campanha = await buscarCampanhaPublica(slug);
  if (!campanha) return { title: "Campanha não encontrada" };
  return {
    title: campanha.titulo,
    description: `${campanha.produto} — comissão de ${formatComissao(campanha.comissao_cents, campanha.comissao_recorrente)} por indicação aprovada. Publicada por ${campanha.empresa_nome}.`,
  };
}

export default async function CampanhaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const campanha = await buscarCampanhaPublica(slug);
  if (!campanha) notFound();

  const [sessao, adesao] = await Promise.all([getSessao(), minhaAdesao(campanha.id)]);
  const atividade = infoAtividade(campanha.atividade_parceiro);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12">
      <Link href="/campanhas" className="text-sm text-muted hover:text-foreground">
        ← Todas as campanhas
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted">{campanha.empresa_nome}</p>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">{campanha.titulo}</h1>
          <p className="text-muted mt-2">{campanha.produto}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted">Comissão por indicação aprovada</p>
          <p className="text-3xl font-semibold text-gold-soft">
            {formatComissao(campanha.comissao_cents, campanha.comissao_recorrente)}
          </p>
          <p className="text-xs text-muted mt-1">integral para o parceiro</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Pill>{campanha.segmento_mercado}</Pill>
        <Pill>{atividade.label}</Pill>
        {campanha.comissao_recorrente && <Pill tom="gold">Comissão recorrente</Pill>}
        {campanha.status === "pausada" && (
          <Pill tom="espera" title="A empresa pausou novas adesões. Indicações já registradas seguem o curso normal.">
            Pausada para novas adesões
          </Pill>
        )}
        {campanha.selo_pendencia_pagamento && (
          <Pill tom="erro" title="A plataforma registrou atraso no pagamento de comissões desta empresa.">
            Pendência de pagamento
          </Pill>
        )}
      </div>

      {campanha.selo_pendencia_pagamento && (
        <div className="mt-6">
          <AvisoFase0>
            Esta empresa tem <strong>atraso registrado no pagamento de comissões</strong>. O selo é
            fato objetivo apurado pela plataforma e fica visível enquanto a pendência durar.
            Considere isso antes de investir seu tempo aqui.
          </AvisoFase0>
        </div>
      )}

      {atividade.regime === "habilitacao" && (
        <div className="mt-6 rounded-xl border border-espera/40 bg-espera/5 p-5">
          <p className="font-medium text-espera">
            Segmento regulado — exige credencial {atividade.conselho ? CONSELHO_LABEL[atividade.conselho] : ""} verificada
          </p>
          <p className="text-sm text-muted mt-2">{atividade.descricao}</p>
          <p className="text-sm text-muted mt-2">
            Para registrar indicação aqui, sua habilitação precisa estar <strong>aprovada e
            dentro da validade</strong>. A verificação é feita pela nossa equipe em até 3 dias
            úteis, contra a consulta pública do conselho.
            {atividade.conselho === "creci" && campanha.territorio_ufs?.length ? (
              <>
                {" "}
                Como o CRECI é estadual, sua inscrição precisa ser de{" "}
                <strong>{campanha.territorio_ufs.join(", ")}</strong>.
              </>
            ) : null}
          </p>
          <div className="mt-4">
            <BotaoLink href="/app/habilitacao" variante="secundario" tamanho="sm">
              Enviar credencial →
            </BotaoLink>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="font-medium mb-1">A oportunidade</h2>
            <dl>
              <Campo label="Público-alvo">{campanha.publico_alvo}</Campo>
              <Campo label="O que conta como resultado útil">
                {campanha.resultado_util}
                <p className="text-xs text-muted mt-1.5">
                  É este o critério que gera comissão. A empresa não pode recusar por critério
                  diferente do publicado aqui.
                </p>
              </Campo>
              {campanha.ticket_cents && (
                <Campo label="Ticket do produto">{formatCents(campanha.ticket_cents)}</Campo>
              )}
              {campanha.comissao_observacao && (
                <Campo label="Observação sobre a comissão">{campanha.comissao_observacao}</Campo>
              )}
              {campanha.territorio_ufs?.length ? (
                <Campo label="Território de atuação">{campanha.territorio_ufs.join(", ")}</Campo>
              ) : null}
            </dl>
          </Card>

          {campanha.descricao && (
            <Card>
              <h2 className="font-medium mb-3">Sobre o produto</h2>
              <p className="text-sm text-muted whitespace-pre-line">{campanha.descricao}</p>
            </Card>
          )}

          <Card>
            <h2 className="font-medium mb-1">Prazos desta campanha</h2>
            <p className="text-sm text-muted mb-3">
              Definidos pela empresa dentro dos limites da política de comissionamento. Eles
              valem contra ela: vencido o prazo de análise sem manifestação, a indicação é
              aprovada automaticamente.
            </p>
            <dl>
              <Campo label="Análise da indicação">
                {campanha.prazo_analise_dias} dias
                <span className="text-muted"> — depois disso, aprovação tácita</span>
              </Campo>
              <Campo label="Pagamento após aprovação">
                {campanha.prazo_pagamento_dias} dias
                <span className="text-muted">
                  {" "}
                  — e {PRAZOS_FIXOS.registroLiquidacaoDiasUteis} dias úteis para registrar a
                  liquidação aqui
                </span>
              </Campo>
              <Campo label="Janela de atribuição">
                {campanha.janela_atribuicao_dias} dias
                <span className="text-muted">
                  {" "}
                  — você tem direito à comissão se o negócio fechar dentro dela, mesmo que já
                  tenha encerrado a adesão
                </span>
              </Campo>
              <Campo label="Janela de estorno">
                {campanha.janela_estorno_dias} dias
                <span className="text-muted"> — só com prova e com 7 dias para você contestar</span>
              </Campo>
            </dl>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <p className="text-xs uppercase tracking-wide text-muted">Sua situação</p>
            {!sessao ? (
              <>
                <p className="text-sm text-muted mt-3">
                  Entre ou crie sua conta de parceiro para aderir a esta campanha.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <BotaoLink href={`/cadastro?perfil=parceiro&next=/campanhas/${campanha.slug}`}>
                    Criar conta de parceiro
                  </BotaoLink>
                  <BotaoLink
                    href={`/entrar?next=/campanhas/${campanha.slug}`}
                    variante="secundario"
                  >
                    Já tenho conta
                  </BotaoLink>
                </div>
              </>
            ) : adesao ? (
              <>
                <div className="mt-3">
                  <Pill tom={adesao.status === "ativa" ? "ok" : "neutro"}>
                    {adesao.status === "ativa" ? "Adesão ativa" : "Adesão encerrada"}
                  </Pill>
                </div>
                <p className="text-sm text-muted mt-3">
                  {adesao.certificacao === "pendente"
                    ? "A certificação de produto ainda está pendente. Conclua para liberar o registro de indicações."
                    : "Você já pode registrar indicações nesta campanha."}
                </p>
                <div className="mt-4">
                  <BotaoLink href="/app/indicacoes/nova">Registrar indicação</BotaoLink>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted mt-3">
                  Você ainda não aderiu. A adesão gera o Contrato de Campanha, que fica
                  congelado e assinado eletronicamente — é ele que prova o que foi combinado.
                </p>
                <div className="mt-4">
                  <BotaoLink href={`/app/campanhas/${campanha.slug}/aderir`}>
                    Aderir à campanha
                  </BotaoLink>
                </div>
                <p className="text-xs text-muted mt-3">
                  Sem exclusividade. Você pode encerrar a adesão quando quiser — indicações já
                  registradas continuam valendo.
                </p>
              </>
            )}
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-wide text-muted">O que você recebe</p>
            <div className="mt-3 space-y-2 text-sm font-mono">
              <Linha
                rotulo="Comissão da campanha"
                valor={formatCents(campanha.comissao_cents)}
              />
              <Linha rotulo="Taxa da plataforma" valor={formatCents(0)} destaque="nao-existe" />
              <div className="border-t border-border/60 pt-2 flex justify-between">
                <span>Você recebe</span>
                <span className="text-gold-soft font-semibold">
                  {formatCents(campanha.comissao_cents)}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted mt-3">
              A plataforma é gratuita para o parceiro. Quem paga a taxa é a empresa, em fatura
              separada — isso não reduz o seu valor.
            </p>
            <p className="text-xs text-muted mt-2">
              Sendo você pessoa física, a empresa faz as retenções legais na qualidade de fonte
              pagadora.
            </p>
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-wide text-muted">Algo errado nesta campanha?</p>
            <p className="text-sm text-muted mt-2">
              O canal de denúncia é aberto e tem prazo de resposta.
            </p>
            <div className="mt-3">
              <BotaoLink href={`/denuncia?campanha=${campanha.slug}`} variante="fantasma" tamanho="sm">
                Abrir denúncia →
              </BotaoLink>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Linha({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: "nao-existe";
}) {
  return (
    <div className="flex justify-between gap-3 text-muted">
      <span>{rotulo}</span>
      <span className={destaque === "nao-existe" ? "text-muted" : ""}>
        {valor}
        {destaque === "nao-existe" && (
          <span className="ml-2 text-[10px] uppercase tracking-wide text-gold-soft">
            não existe
          </span>
        )}
      </span>
    </div>
  );
}
