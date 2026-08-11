import type { Metadata } from "next";
import { PageHeader, Stat, Card, EmptyState, BotaoLink, Pill } from "@/components/ui";
import { resumoPorStatus, somarComissoes, listarMinhasIndicacoes } from "@/lib/data/indicacoes";
import { formatCents, formatPrazo, formatData } from "@/lib/format";
import { STATUS_INFO } from "@/lib/domain/indicacoes";

export const metadata: Metadata = { title: "Painel do parceiro" };

export default async function PainelParceiro() {
  const [resumo, aReceber, recebido, recentes] = await Promise.all([
    resumoPorStatus("parceiro"),
    somarComissoes(["aprovada"]),
    somarComissoes(["paga"]),
    listarMinhasIndicacoes(),
  ]);

  const emAndamento = resumo.registrada + resumo.em_analise;

  return (
    <>
      <PageHeader
        titulo="Painel"
        descricao="Suas indicações, prazos e comissões. A plataforma é gratuita para você — nada do que aparece aqui sofre desconto."
        acao={<BotaoLink href="/campanhas">Ver campanhas</BotaoLink>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Stat label="Em andamento" valor={String(emAndamento)} detalhe="registradas + em análise" />
        <Stat
          label="A receber"
          valor={formatCents(aReceber)}
          detalhe="aprovadas, aguardando pagamento"
          tom={aReceber > 0 ? "espera" : undefined}
        />
        <Stat label="Recebido" valor={formatCents(recebido)} detalhe="liquidação registrada" tom="ok" />
        <Stat
          label="Contestáveis"
          valor={String(resumo.recusada)}
          detalhe="recusadas — 7 dias para contestar"
          tom={resumo.recusada > 0 ? "erro" : undefined}
        />
      </div>

      <Card className="mb-8">
        <h2 className="font-medium">Indicações recentes</h2>
        {recentes.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              titulo="Nenhuma indicação registrada ainda"
              descricao="Adira a uma campanha e registre o cliente ANTES do primeiro contato dele com a empresa — o carimbo de tempo do registro é o que garante a sua comissão se outro parceiro indicar o mesmo lead."
              acao={<BotaoLink href="/campanhas" variante="secundario" tamanho="sm">Escolher uma campanha</BotaoLink>}
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border/60">
            {recentes.slice(0, 8).map((i) => {
              const info = STATUS_INFO[i.status];
              return (
                <li key={i.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{i.lead_empresa_nome}</p>
                    <p className="text-xs text-muted truncate">
                      {i.campanhas?.titulo ?? "—"} · registrada em {formatData(i.registrada_em)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm">{formatCents(i.comissao_cents)}</span>
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
          <h2 className="font-medium">Prazos que correm contra a empresa</h2>
          <p className="text-sm text-muted mt-2">
            Vencido o prazo de análise sem manifestação, a indicação é{" "}
            <strong className="text-foreground">aprovada automaticamente</strong> — e gera
            comissão do mesmo jeito. Você não precisa cobrar ninguém para isso acontecer.
          </p>
          {recentes.filter((i) => i.status === "registrada" || i.status === "em_analise").length > 0 && (
            <ul className="mt-4 space-y-2 text-sm">
              {recentes
                .filter((i) => i.status === "registrada" || i.status === "em_analise")
                .slice(0, 4)
                .map((i) => (
                  <li key={i.id} className="flex justify-between gap-3 text-muted">
                    <span className="truncate">{i.lead_empresa_nome}</span>
                    <span className="shrink-0">análise {formatPrazo(i.prazo_analise_em)}</span>
                  </li>
                ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-medium">Você não paga nada</h2>
          <p className="text-sm text-muted mt-2">
            Não existe taxa, retenção ou mensalidade cobrada de você. A empresa paga a comissão
            diretamente na sua chave Pix; a plataforma cobra dela, em fatura separada.
          </p>
          <p className="text-sm text-muted mt-2">
            Se a empresa atrasar, a escala de sanção começa no primeiro dia: notificação,
            campanhas pausadas, selo público de pendência e suspensão da conta.
          </p>
          <div className="mt-4">
            <BotaoLink href="/termos/comissionamento" variante="fantasma" tamanho="sm">
              Ver a política completa →
            </BotaoLink>
          </div>
        </Card>
      </div>
    </>
  );
}
