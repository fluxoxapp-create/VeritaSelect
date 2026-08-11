import type { Metadata } from "next";
import { PageHeader, Card, BotaoLink } from "@/components/ui";
import { PRAZOS, PRAZOS_FIXOS, ESCALA_INADIMPLENCIA } from "@/lib/domain/indicacoes";

export const metadata: Metadata = {
  title: "Como funciona",
  description:
    "Da campanha à comissão: registro com carimbo de tempo, aprovação com prazo, aprovação tácita e pagamento direto da empresa ao parceiro.",
};

export default function ComoFunciona() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <PageHeader
        titulo="Como funciona"
        descricao="Quatro passos, cada um com prova registrada. Os prazos correm sozinhos — ninguém precisa cobrar ninguém para que a regra valha."
      />

      <div className="space-y-4">
        <Passo n="01" titulo="A empresa publica a campanha">
          Define o produto, o público-alvo, a comissão que paga e — o mais importante —{" "}
          <strong className="text-foreground">o que conta como resultado útil</strong>. Esse
          critério vira contrato: ela não poderá recusar uma indicação por motivo diferente do
          que publicou.
        </Passo>

        <Passo n="02" titulo="O parceiro adere">
          Sem vaga, sem entrevista, sem recrutamento. O parceiro escolhe a campanha e aceita o
          Contrato de Campanha, que é congelado e hasheado com data, hora e IP. Se a empresa
          alterar a campanha depois, o contrato dele continua sendo o que ele leu.
        </Passo>

        <Passo n="03" titulo="Indica e registra">
          O parceiro registra o cliente <strong className="text-foreground">antes</strong> do
          primeiro contato dele com a empresa. O registro gera um carimbo de tempo com IP — é
          essa marca que decide a atribuição se dois parceiros indicarem o mesmo lead. Vale o
          primeiro registro válido.
        </Passo>

        <Passo n="04" titulo="A empresa aprova e paga">
          A empresa tem o prazo da campanha para aprovar ou recusar. Recusa exige motivo de uma
          lista fechada e prova. Aprovada, ela paga a comissão{" "}
          <strong className="text-foreground">diretamente ao parceiro</strong> e registra a
          liquidação aqui.
        </Passo>
      </div>

      <Card className="mt-10">
        <h2 className="font-medium">O prazo corre contra a empresa</h2>
        <p className="text-sm text-muted mt-2">
          Vencido o prazo de análise sem manifestação, a indicação é{" "}
          <strong className="text-foreground">aprovada automaticamente</strong> e gera comissão
          normalmente. A empresa é avisada {PRAZOS_FIXOS.avisoAntesDoVencimentoDias} dias antes do
          vencimento — o silêncio dela não pode virar prejuízo de quem trabalhou.
        </p>
        <table className="w-full text-sm mt-5">
          <thead>
            <tr className="text-left text-muted">
              <th className="font-normal pb-2">Prazo</th>
              <th className="font-normal pb-2">Padrão</th>
              <th className="font-normal pb-2">Limites</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            {Object.values(PRAZOS).map((p) => (
              <tr key={p.label} className="border-t border-border/50">
                <td className="py-2 pr-4">{p.label}</td>
                <td className="py-2 pr-4">{p.padrao} dias</td>
                <td className="py-2">
                  {p.min} a {p.max} dias
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-muted mt-4">
          A campanha não pode ser publicada com prazos fora desses limites. A validação é do
          servidor e do banco, não do formulário.
        </p>
      </Card>

      <Card className="mt-6">
        <h2 className="font-medium">Se a empresa atrasar o pagamento</h2>
        <p className="text-sm text-muted mt-2">
          A escala começa no primeiro dia e é automática. O parceiro não precisa reclamar para
          que ela corra.
        </p>
        <ol className="mt-4 space-y-2 text-sm text-muted">
          {ESCALA_INADIMPLENCIA.map((e) => (
            <li key={e.dias} className="flex gap-4">
              <span className="font-mono text-xs text-espera w-16 shrink-0 pt-0.5">
                {e.dias} {e.dias === 1 ? "dia" : "dias"}
              </span>
              <span>{e.consequencia}</span>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="mt-6">
        <h2 className="font-medium">Duas relações financeiras que nunca se cruzam</h2>
        <pre className="mt-4 text-xs font-mono text-muted overflow-x-auto leading-relaxed">
{`Empresa  ──── comissão integral ────►  Parceiro       (fora da plataforma)
Empresa  ──── fatura mensal ───────►  Verita Select  (taxa por indicação aprovada)
Parceiro ──── nada ────────────────►  Verita Select  (a plataforma é gratuita para ele)`}
        </pre>
        <p className="text-sm text-muted mt-4">
          A plataforma não custodia, não intermedia e não repassa recursos. Não existe carteira,
          saldo, escrow ou saque — custódia de dinheiro de terceiro é atividade de instituição de
          pagamento, e este não é o nosso negócio.
        </p>
      </Card>

      <div className="mt-10 flex flex-wrap gap-3">
        <BotaoLink href="/campanhas">Ver campanhas</BotaoLink>
        <BotaoLink href="/termos/comissionamento" variante="secundario">
          Ler a política completa
        </BotaoLink>
      </div>
    </div>
  );
}

function Passo({
  n,
  titulo,
  children,
}: {
  n: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex gap-5">
        <span className="font-mono text-sm text-gold shrink-0">{n}</span>
        <div>
          <p className="font-medium">{titulo}</p>
          <p className="text-sm text-muted mt-2">{children}</p>
        </div>
      </div>
    </Card>
  );
}
