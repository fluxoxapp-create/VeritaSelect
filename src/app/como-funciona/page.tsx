const STEPS = [
  {
    title: "1. Escolha uma seleção",
    text: "Navegue por oportunidades curadas — veículos, máquinas agrícolas, embarcações e experiências, todas com organizador verificado.",
  },
  {
    title: "2. Garanta seus acessos",
    text: "Defina quantos acessos (cotas) quer e pague via Pix com confirmação instantânea.",
  },
  {
    title: "3. Acompanhe a apuração",
    text: "A data e a regra de apuração são públicas desde o lançamento — o resultado segue o sorteio oficial da Loteria Federal.",
  },
  {
    title: "4. Receba seu prêmio",
    text: "Ganhadores são contatados, validados e o processo de entrega é acompanhado pela equipe VeritaSelect até a conclusão.",
  },
];

const TIERS = [
  {
    name: "Acesso",
    range: "R$ 19 – 49",
    description: "Entrada para participar de seleções abertas com prêmios de alto giro.",
  },
  {
    name: "Premium",
    range: "R$ 99 – 299",
    description: "Seleções com prêmios de maior valor e menos participantes por vaga.",
  },
  {
    name: "Elite",
    range: "R$ 500+",
    description: "Curadoria reduzida, experiências exclusivas e atendimento dedicado.",
  },
];

export default function ComoFuncionaPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16 space-y-20">
      <div>
        <h1 className="text-3xl font-semibold">Como funciona</h1>
        <p className="text-muted mt-2 max-w-2xl">
          A VeritaSelect conecta pessoas a oportunidades selecionadas — com curadoria,
          verificação de organizadores e total transparência sobre regras e
          resultados.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {STEPS.map((step) => (
          <div key={step.title} className="rounded-xl border border-border bg-surface p-6">
            <h2 className="font-semibold mb-2">{step.title}</h2>
            <p className="text-sm text-muted">{step.text}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">Camadas de acesso</h2>
        <p className="text-muted mb-8 max-w-2xl">
          As seleções são organizadas em camadas, para que cada pessoa encontre
          o nível de oportunidade e exclusividade que faz sentido para ela.
        </p>
        <div className="grid sm:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <div key={tier.name} className="rounded-xl border border-border bg-surface p-6">
              <p className="text-xs uppercase tracking-wide text-gold-soft mb-2">{tier.name}</p>
              <p className="text-2xl font-semibold mb-3">{tier.range}</p>
              <p className="text-sm text-muted">{tier.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
