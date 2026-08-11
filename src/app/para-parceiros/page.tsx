import type { Metadata } from "next";
import { PageHeader, Card, BotaoLink, Pill } from "@/components/ui";
import { CONSELHO_LABEL, CORE_NAO_COLETADO } from "@/lib/domain/atividades";

export const metadata: Metadata = {
  title: "Para parceiros",
  description:
    "Escolha o que vender, sem vínculo e sem exclusividade. A comissão vai integral para você — a plataforma é gratuita para o parceiro.",
};

export default function ParaParceiros() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <PageHeader
        titulo="Para o parceiro comercial autônomo"
        descricao="Um cardápio de campanhas com comissão, público e ticket à vista. Você decide onde investir seu tempo — e recebe integralmente pelo que fechar."
      />

      <Card className="mb-6">
        <h2 className="font-medium">Você recebe o valor cheio</h2>
        <div className="mt-4 space-y-2 text-sm font-mono">
          <div className="flex justify-between text-muted">
            <span>Comissão da campanha</span>
            <span>R$ 300,00</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Taxa da plataforma</span>
            <span>
              R$ 0,00
              <span className="ml-2 text-[10px] uppercase tracking-wide text-gold-soft">
                não existe
              </span>
            </span>
          </div>
          <div className="flex justify-between border-t border-border/60 pt-2">
            <span>Você recebe</span>
            <span className="text-gold-soft font-semibold">R$ 300,00</span>
          </div>
        </div>
        <p className="text-sm text-muted mt-4">
          Não há taxa, retenção, mensalidade ou tarifa cobrada de você. Quem paga a plataforma é
          a empresa, em fatura separada — isso não reduz o seu valor. É de propósito: não existe
          relação financeira entre a plataforma e o parceiro.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <Item titulo="Sem vínculo">
          Você é profissional autônomo. Não há jornada, escala, ponto, meta individual com sanção
          nem chefe. A plataforma não tem sequer campo para isso.
        </Item>
        <Item titulo="Sem exclusividade">
          Atue em quantas campanhas quiser, ao mesmo tempo, inclusive de concorrentes. Encerre
          quando quiser, sem multa nem aviso prévio.
        </Item>
        <Item titulo="Você indica, não fecha">
          Sua atividade é de mediação: apresenta e registra o interesse. Não assina contrato, não
          dá desconto e não recebe valores em nome da empresa.
        </Item>
        <Item titulo="O prazo trabalha para você">
          Se a empresa não analisar dentro do prazo, a indicação é aprovada automaticamente e
          gera comissão. Você não precisa cobrar ninguém.
        </Item>
      </div>

      <Card className="mb-6">
        <h2 className="font-medium">O que protege a sua comissão</h2>
        <ul className="mt-3 space-y-3 text-sm text-muted">
          <li>
            <strong className="text-foreground">Carimbo de tempo no registro.</strong> Se dois
            parceiros indicarem o mesmo lead, vence o primeiro registro válido — aferido por log
            com data, hora e IP, não por versão de ninguém.
          </li>
          <li>
            <strong className="text-foreground">Recusa exige motivo e prova.</strong> A empresa só
            pode recusar por um dos motivos de uma lista fechada, com prova. Alegar que o lead já
            era cliente exige documento datado de <em>antes</em> do seu registro. Recusa genérica
            é inválida.
          </li>
          <li>
            <strong className="text-foreground">Janela de atribuição.</strong> Se o negócio fechar
            dentro da janela da campanha, a comissão é sua mesmo que você já tenha encerrado a
            adesão.
          </li>
          <li>
            <strong className="text-foreground">Contestação com prazo.</strong> Recusado ou
            estornado, você tem 7 dias para contestar. Se a empresa não responder em 5 dias, a
            contestação é considerada procedente.
          </li>
          <li>
            <strong className="text-foreground">Conjunto probatório.</strong> Precisando cobrar
            judicialmente, a plataforma fornece o contrato assinado, o log do registro, a
            aprovação e as comunicações.
          </li>
        </ul>
      </Card>

      <Card className="mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-medium">Campanhas reguladas</h2>
          <Pill tom="espera">Exige credencial</Pill>
        </div>
        <p className="text-sm text-muted mt-2">
          A maioria das campanhas — software, serviços e produtos B2B — não exige nada de você.
          Algumas exigem credencial profissional verificada, porque a atividade em si é privativa:
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-muted">
          <li>
            <strong className="text-foreground">{CONSELHO_LABEL.susep}</strong> — seguros,
            previdência aberta, planos de saúde
          </li>
          <li>
            <strong className="text-foreground">{CONSELHO_LABEL.creci}</strong> — intermediação
            imobiliária (estadual: a UF importa)
          </li>
          <li>
            <strong className="text-foreground">{CONSELHO_LABEL.cvm}</strong> — valores
            mobiliários e investimentos
          </li>
        </ul>
        <p className="text-sm text-muted mt-3">
          Crédito, empréstimo e consórcio permanecem fechados — nesses casos não existe registro
          individual que você possa apresentar.
        </p>
        <p className="text-sm text-muted mt-4 pt-4 border-t border-border/60">
          <strong className="text-foreground">Não pedimos seu CORE.</strong> {CORE_NAO_COLETADO}
        </p>
      </Card>

      <div className="flex flex-wrap gap-3">
        <BotaoLink href="/cadastro?perfil=parceiro">Criar conta de parceiro</BotaoLink>
        <BotaoLink href="/campanhas" variante="secundario">
          Ver campanhas abertas
        </BotaoLink>
      </div>
    </div>
  );
}

function Item({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Card>
      <p className="font-medium">{titulo}</p>
      <p className="text-sm text-muted mt-2">{children}</p>
    </Card>
  );
}
