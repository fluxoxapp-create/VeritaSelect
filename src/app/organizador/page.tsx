import { OrganizerShell } from "@/components/organizer-shell";

const STATS = [
  { label: "Status da verificação", value: "Aprovado ✓" },
  { label: "Seleções publicadas", value: "4" },
  { label: "Acessos vendidos (mês)", value: "8.420" },
  { label: "Reputação", value: "★ 4.9 / 5" },
];

export default function OrganizadorPage() {
  return (
    <OrganizerShell
      title="Painel do organizador"
      description="Acompanhe suas seleções, vendas e status de verificação na VeritaSelect."
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {STATS.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-surface p-5">
            <p className="text-xs text-muted uppercase tracking-wide">{stat.label}</p>
            <p className="text-xl font-semibold mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gold/40 bg-surface p-6">
        <p className="font-medium mb-1">Quer publicar uma nova seleção?</p>
        <p className="text-sm text-muted">
          Toda nova campanha passa por validação de documentos do prêmio antes
          de entrar no ar — isso é o que mantém a confiança do nosso público.
        </p>
      </div>
    </OrganizerShell>
  );
}
