import Link from "next/link";
import { BotaoLink, Card, Pill } from "@/components/ui";
import { listarCampanhasPublicas } from "@/lib/data/campanhas";
import { formatComissao } from "@/lib/format";
import { infoAtividade } from "@/lib/domain/atividades";

export default async function Home() {
  const destaques = (await listarCampanhasPublicas()).slice(0, 3);

  return (
    <>
      <section className="hero-glow border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-28 text-center">
          <Pill tom="gold">Marketplace de oportunidades de venda B2B</Pill>
          <h1 className="mt-6 text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.08]">
            Empresas que querem vender.
            <br />
            Vendedores que <span className="text-gradient-gold">escolhem</span> o que vender.
          </h1>
          <p className="mt-6 text-base sm:text-lg text-muted max-w-2xl mx-auto">
            A empresa publica uma campanha com a comissão que paga. O parceiro escolhe onde
            atuar, indica clientes e recebe a comissão <strong className="text-foreground">integral</strong> —
            sem vínculo, sem exclusividade, sem CLT.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <BotaoLink href="/campanhas">Ver campanhas</BotaoLink>
            <BotaoLink href="/para-empresas" variante="secundario">
              Publicar uma campanha
            </BotaoLink>
          </div>
          <p className="mt-6 text-xs text-muted">
            A plataforma é gratuita para o parceiro. Nenhuma taxa, nenhuma retenção.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <p className="text-xs uppercase tracking-wide text-gold-soft">Para a empresa</p>
            <h2 className="text-xl font-semibold mt-2">Venda mais sem contratar</h2>
            <p className="text-sm text-muted mt-2">
              Uma rede de vendedores independentes, pagando só quando a indicação é aprovada
              por você.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-muted">
              <Item>Publique campanhas com a comissão que você define</Item>
              <Item>Aprove cada indicação — você decide o que vira venda</Item>
              <Item>Pague o parceiro direto; a plataforma cobra só de você</Item>
              <Item>Certifique quem vende o seu produto antes de liberar</Item>
            </ul>
            <div className="mt-6">
              <BotaoLink href="/para-empresas" variante="secundario" tamanho="sm">
                Área da empresa →
              </BotaoLink>
            </div>
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-wide text-gold-soft">Para o parceiro</p>
            <h2 className="text-xl font-semibold mt-2">Escolha o que vender</h2>
            <p className="text-sm text-muted mt-2">
              Um cardápio de campanhas com comissão, público e ticket à vista. Você decide onde
              investir seu tempo.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-muted">
              <Item>Receba a comissão integral — a plataforma é grátis para você</Item>
              <Item>Atue em quantas campanhas quiser, sem exclusividade</Item>
              <Item>Registre a indicação e acompanhe até o pagamento</Item>
              <Item>Sem meta, sem jornada, sem chefe</Item>
            </ul>
            <div className="mt-6">
              <BotaoLink href="/para-parceiros" variante="secundario" tamanho="sm">
                Área do parceiro →
              </BotaoLink>
            </div>
          </Card>
        </div>
      </section>

      <section className="border-y border-border/60 bg-surface/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
          <p className="text-xs uppercase tracking-wide text-gold-soft">Como funciona</p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-2">
            Da campanha à comissão, com prova em cada passo
          </h2>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Passo n="01" titulo="Empresa publica">
              Define produto, público, comissão e o que conta como resultado útil.
            </Passo>
            <Passo n="02" titulo="Parceiro adere">
              Escolhe a campanha, faz a certificação de produto e aceita o contrato.
            </Passo>
            <Passo n="03" titulo="Indica e registra">
              Prospecta e registra o cliente com carimbo de tempo — a prova da atribuição.
            </Passo>
            <Passo n="04" titulo="Aprova e paga">
              A empresa aprova, paga o parceiro direto e a comissão vai integral.
            </Passo>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-wide text-gold-soft">Campanhas no ar</p>
            <h2 className="text-2xl font-semibold tracking-tight mt-2">
              Onde dá para atuar agora
            </h2>
          </div>
          <Link href="/campanhas" className="text-sm text-muted hover:text-foreground">
            Ver todas →
          </Link>
        </div>

        {destaques.length === 0 ? (
          <Card className="text-center py-12">
            <p className="font-medium">Nenhuma campanha publicada ainda.</p>
            <p className="text-sm text-muted mt-2 max-w-md mx-auto">
              A plataforma está em construção — a Fase 0 (constituição da PJ e revisão jurídica
              dos contratos) precisa fechar antes da primeira campanha real ir ao ar.
            </p>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {destaques.map((c) => (
              <Link
                key={c.id}
                href={`/campanhas/${c.slug}`}
                className="rounded-xl border border-border bg-surface p-5 hover:border-gold/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted truncate">{c.empresa_nome}</span>
                  {c.regime === "habilitacao" && <Pill tom="espera">Regulado</Pill>}
                </div>
                <p className="font-medium mt-2 leading-snug">{c.titulo}</p>
                <p className="text-sm text-muted mt-1 line-clamp-2">{c.produto}</p>
                <div className="mt-4 pt-4 border-t border-border/60 flex items-baseline justify-between gap-3">
                  <span className="text-lg font-semibold text-gold-soft">
                    {formatComissao(c.comissao_cents, c.comissao_recorrente)}
                  </span>
                  <span className="text-xs text-muted truncate">
                    {infoAtividade(c.atividade_parceiro).label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-20">
        <Card className="text-center">
          <h2 className="text-xl font-semibold">A plataforma nunca toca no dinheiro</h2>
          <p className="text-sm text-muted mt-3 max-w-2xl mx-auto">
            A empresa paga a comissão diretamente ao parceiro, por meio próprio. Nenhum valor
            transita por aqui — não há carteira, saldo, custódia ou repasse. A Verita Select
            cobra apenas da empresa, em fatura mensal separada, um valor fixo por indicação
            aprovada.
          </p>
          <div className="mt-6">
            <BotaoLink href="/seguranca" variante="secundario" tamanho="sm">
              Como garantimos isso →
            </BotaoLink>
          </div>
        </Card>
      </section>
    </>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span aria-hidden className="text-gold shrink-0">
        ◇
      </span>
      <span>{children}</span>
    </li>
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
    <div className="rounded-xl border border-border bg-surface p-5">
      <span className="font-mono text-xs text-gold">{n}</span>
      <p className="font-medium mt-2">{titulo}</p>
      <p className="text-sm text-muted mt-1.5">{children}</p>
    </div>
  );
}
