const PILLARS = [
  {
    title: "Verificação de organizadores (KYC)",
    text: "Documento, selfie, comprovação de propriedade do prêmio e histórico são validados pela equipe VeritaSelect antes de qualquer publicação.",
  },
  {
    title: "Apuração pública e auditável",
    text: "O resultado segue a extração oficial da Loteria Federal — regra fixa, divulgada desde o início da seleção, sem espaço para manipulação.",
  },
  {
    title: "Pagamentos protegidos",
    text: "Transações via Pix com gateway homologado, monitoramento antifraude e retenção de valores até a confirmação da entrega do prêmio.",
  },
  {
    title: "Privacidade e LGPD",
    text: "Seus dados são tratados conforme a Lei Geral de Proteção de Dados, com acesso restrito e logs de auditoria.",
  },
  {
    title: "Conta protegida",
    text: "Autenticação reforçada, alertas de acesso e limites de segurança para compradores e organizadores.",
  },
];

export default function SegurancaPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16 space-y-10">
      <div>
        <h1 className="text-3xl font-semibold">Segurança e transparência</h1>
        <p className="text-muted mt-2 max-w-2xl">
          Público premium não aposta no escuro. Por isso, cada etapa da VeritaSelect
          — do anúncio à entrega do prêmio — segue regras públicas e
          verificáveis.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {PILLARS.map((pillar) => (
          <div key={pillar.title} className="rounded-xl border border-border bg-surface p-6">
            <h2 className="font-semibold mb-2">{pillar.title}</h2>
            <p className="text-sm text-muted">{pillar.text}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gold/40 bg-surface p-6">
        <p className="text-sm text-muted">
          Encontrou algo que parece fora do padrão? Fale com o nosso suporte —
          toda denúncia é apurada e organizadores reincidentes são banidos da
          plataforma.
        </p>
      </div>
    </div>
  );
}
