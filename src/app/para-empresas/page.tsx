import type { Metadata } from "next";
import { PageHeader, Card, BotaoLink, AvisoFase0 } from "@/components/ui";
import { MOTIVOS_RECUSA, MOTIVO_RECUSA_INFO, PRAZOS_FIXOS } from "@/lib/domain/indicacoes";

export const metadata: Metadata = {
  title: "Para empresas",
  description:
    "Publique campanhas com a comissão que você define. Pague só quando aprovar a indicação — e pague o parceiro diretamente.",
};

export default function ParaEmpresas() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <PageHeader
        titulo="Para a empresa anunciante"
        descricao="Uma rede de vendedores independentes que você não contrata, não gerencia e não paga por hora. Você paga por resultado — e só pelo resultado que você mesmo reconhecer."
      />

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <Item titulo="Você define a comissão">
          Publique o valor que faz sentido para o seu ticket. Parceiros decidem se vale o tempo
          deles — não há negociação individual nem gestão de equipe.
        </Item>
        <Item titulo="Você decide o que vira venda">
          O resultado útil é definido por você na campanha. Nenhuma comissão é devida por
          critério que você não publicou.
        </Item>
        <Item titulo="Você paga direto">
          A comissão vai de você para o parceiro, por meio próprio. Nada transita pela
          plataforma — sem split, sem escrow, sem intermediário no caminho do seu dinheiro.
        </Item>
        <Item titulo="Você certifica quem vende">
          Campanhas podem exigir certificação de produto antes de liberar o registro de
          indicações. Material seu, questionário seu.
        </Item>
      </div>

      <Card className="mb-6">
        <h2 className="font-medium">O que você paga à plataforma</h2>
        <p className="text-sm text-muted mt-2">
          Assinatura mensal mais um valor fixo por{" "}
          <strong className="text-foreground">indicação aprovada</strong>. Não cobramos por
          indicação registrada — isso seria cobrar por lixo. E não cobramos por venda fechada,
          porque não vemos a sua venda.
        </p>
        <ul className="mt-4 space-y-2.5 text-sm text-muted">
          <li>Fatura mensal com extrato item a item, cada taxa apontando para a indicação que a gerou.</li>
          <li>Estorno de comissão devolve a taxa como crédito na fatura seguinte.</li>
          <li>Contestação de lançamento em 10 dias: suspende só o valor contestado.</li>
        </ul>
        <div className="mt-5">
          <AvisoFase0>
            As faixas de taxa ainda não foram definidas — é item aberto da Fase 0, junto com a
            revisão dos contratos por advogado. Nenhuma cobrança é apurada até que a tabela entre
            em vigor, e ela valerá apenas para indicações registradas a partir da vigência.
          </AvisoFase0>
        </div>
      </Card>

      <Card className="mb-6 border-espera/40">
        <h2 className="font-medium text-espera">Duas regras que pegam quem não lê</h2>
        <p className="text-sm text-muted mt-3">
          <strong className="text-foreground">1. Aprovação tácita.</strong> Vencido o prazo de
          análise sem manifestação, a indicação é aprovada automaticamente — gerando comissão ao
          parceiro e taxa na sua fatura. Avisamos {PRAZOS_FIXOS.avisoAntesDoVencimentoDias} dias
          antes. O silêncio da empresa não pode virar prejuízo de quem trabalhou.
        </p>
        <p className="text-sm text-muted mt-3">
          <strong className="text-foreground">2. Anti-desintermediação.</strong> A taxa é devida
          por 12 meses sobre negócio nascido de aproximação feita na plataforma, ainda que
          fechado fora dela (Código Civil art. 727).
        </p>
      </Card>

      <Card className="mb-6">
        <h2 className="font-medium">Como recusar uma indicação</h2>
        <p className="text-sm text-muted mt-2">
          Só por um destes motivos, sempre com prova. Recusa genérica é inválida e devolve a
          indicação para análise com prazo reduzido de 5 dias.
        </p>
        <dl className="mt-4 space-y-3 text-sm">
          {MOTIVOS_RECUSA.map((m) => (
            <div key={m}>
              <dt className="text-foreground">{MOTIVO_RECUSA_INFO[m].label}</dt>
              <dd className="text-muted text-xs mt-0.5">{MOTIVO_RECUSA_INFO[m].prova}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="mb-6">
        <h2 className="font-medium">O que você não pode fazer</h2>
        <p className="text-sm text-muted mt-2">
          O parceiro é autônomo. Exercer poder de direção sobre ele caracteriza vínculo
          empregatício — e o passivo é seu, não nosso. Por isso a plataforma simplesmente não tem
          onde registrar:
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-muted">
          <li>jornada, escala, ponto ou disponibilidade obrigatória</li>
          <li>meta individual com sanção</li>
          <li>exclusividade</li>
          <li>advertência, suspensão ou avaliação disciplinar</li>
          <li>exigência de execução pessoal</li>
        </ul>
        <p className="text-sm text-muted mt-3">
          Vocabulário também conta: aqui não existe vaga, contratação, demissão, funcionário,
          salário nem supervisor. Existe campanha, adesão, encerramento, parceiro credenciado,
          comissão e responsável pela campanha.
        </p>
      </Card>

      <div className="flex flex-wrap gap-3">
        <BotaoLink href="/cadastro?perfil=empresa">Cadastrar minha empresa</BotaoLink>
        <BotaoLink href="/termos/empresa" variante="secundario">
          Ler os termos
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
