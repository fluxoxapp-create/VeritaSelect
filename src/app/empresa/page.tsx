import type { Metadata } from "next";
import { PageHeader, Stat, Card, EmptyState, BotaoLink, Pill } from "@/components/ui";
import { resumoPorStatus, listarIndicacoesRecebidas } from "@/lib/data/indicacoes";
import { formatCents, formatPrazo, diasAte } from "@/lib/format";
import { STATUS_INFO, PRAZOS_FIXOS } from "@/lib/domain/indicacoes";

export const metadata: Metadata = { title: "Painel da empresa" };

export default async function PainelEmpresa() {
  const [resumo, recebidas] = await Promise.all([
    resumoPorStatus("empresa"),
    listarIndicacoesRecebidas(),
  ]);

  const naFila = recebidas.filter((i) => i.status === "registrada" || i.status === "em_analise");
  const aPagar = recebidas.filter((i) => i.status === "aprovada");
  const totalAPagar = aPagar.reduce((s, i) => s + i.comissao_cents, 0);

  // Aviso de 3 dias antes da aprovação tácita — política 06 §5-A.2.
  const perto = naFila.filter((i) => {
    const d = diasAte(i.prazo_analise_em);
    return d !== null && d <= PRAZOS_FIXOS.avisoAntesDoVencimentoDias;
  });

  return (
    <>
      <PageHeader
        titulo="Painel"
        descricao="Indicações recebidas, prazos correndo e o que você deve aos parceiros. O pagamento da comissão é seu, feito diretamente a eles."
        acao={<BotaoLink href="/empresa/campanhas/nova">Nova campanha</BotaoLink>}
      />

      {perto.length > 0 && (
        <Card className="mb-6 border-espera/50">
          <p className="font-medium text-espera">
            {perto.length} {perto.length === 1 ? "indicação está" : "indicações estão"} perto da
            aprovação tácita
          </p>
          <p className="text-sm text-muted mt-2">
            Vencido o prazo de análise sem sua manifestação, a indicação é{" "}
            <strong className="text-foreground">aprovada automaticamente</strong> — gerando
            comissão ao parceiro e taxa na sua fatura. Este é o aviso de{" "}
            {PRAZOS_FIXOS.avisoAntesDoVencimentoDias} dias previsto no contrato.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {perto.slice(0, 5).map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="truncate">{i.lead_empresa_nome}</span>
                <span className="text-espera shrink-0">{formatPrazo(i.prazo_analise_em)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <BotaoLink href="/empresa/indicacoes" tamanho="sm">
              Analisar agora
            </BotaoLink>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Stat
          label="Na fila"
          valor={String(naFila.length)}
          detalhe="aguardando sua análise"
          tom={naFila.length > 0 ? "espera" : undefined}
        />
        <Stat label="Aprovadas" valor={String(resumo.aprovada)} detalhe="a pagar ao parceiro" tom="ok" />
        <Stat label="Comissões a pagar" valor={formatCents(totalAPagar)} detalhe="pagamento direto ao parceiro" />
        <Stat
          label="Em disputa"
          valor={String(resumo.em_disputa)}
          detalhe={`resposta em ${PRAZOS_FIXOS.respostaEmpresaDias} dias`}
          tom={resumo.em_disputa > 0 ? "erro" : undefined}
        />
      </div>

      <Card className="mb-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-medium">Fila de aprovação</h2>
          <BotaoLink href="/empresa/indicacoes" variante="fantasma" tamanho="sm">
            Ver todas →
          </BotaoLink>
        </div>
        {naFila.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              titulo="Nada aguardando análise"
              descricao="Quando um parceiro registrar uma indicação, ela aparece aqui com o prazo correndo. Publique campanhas para começar a receber."
              acao={<BotaoLink href="/empresa/campanhas/nova" variante="secundario" tamanho="sm">Criar campanha</BotaoLink>}
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border/60">
            {naFila.slice(0, 8).map((i) => {
              const info = STATUS_INFO[i.status];
              return (
                <li key={i.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{i.lead_empresa_nome}</p>
                    <p className="text-xs text-muted truncate">
                      {i.campanhas?.titulo ?? "—"} · contato: {i.lead_contato_nome}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted">{formatPrazo(i.prazo_analise_em)}</span>
                    <Pill tom={info.tom} title={info.significado}>
                      {info.label}
                    </Pill>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="font-medium">Como você paga</h2>
          <p className="text-sm text-muted mt-2">
            A comissão vai <strong className="text-foreground">direto de você para o parceiro</strong>,
            por meio próprio. Nenhum valor transita pela plataforma — não há split, escrow ou
            repasse.
          </p>
          <p className="text-sm text-muted mt-2">
            Depois de pagar, registre a liquidação aqui em até{" "}
            {PRAZOS_FIXOS.registroLiquidacaoDiasUteis} dias úteis. Não registrar faz presumir
            inadimplemento e aciona a escala de sanção.
          </p>
        </Card>

        <Card>
          <h2 className="font-medium">O que você paga à plataforma</h2>
          <p className="text-sm text-muted mt-2">
            Assinatura mensal mais um valor fixo por indicação aprovada, cobrado em fatura
            separada com extrato item a item. Estorno de comissão devolve a taxa como crédito.
          </p>
          <div className="mt-4">
            <BotaoLink href="/empresa/fatura" variante="secundario" tamanho="sm">
              Ver fatura →
            </BotaoLink>
          </div>
        </Card>
      </div>
    </>
  );
}
