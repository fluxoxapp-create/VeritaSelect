const CLAUSES = [
  {
    title: "1. Definições",
    text: "Plataforma, Usuário, Conta, Seleção (campanha disponibilizada), Acesso (direito individual de participação), Contemplação (resultado obtido conforme regulamento específico) e Regulamento Específico (documento aplicável a cada seleção).",
  },
  {
    title: "2. Aceitação dos termos",
    text: "O cadastro e o uso da plataforma pressupõem a leitura e aceite eletrônico destes termos, com validade jurídica equivalente à assinatura física.",
  },
  {
    title: "3. Objeto da plataforma",
    text: "A Verita oferece acesso digital a seleções — campanhas promocionais com curadoria, organizador verificado e regulamento próprio — conforme descrito em cada página de seleção.",
  },
  {
    title: "4. Natureza da operação",
    text: "A plataforma não oferece aposta esportiva, não opera cassino, não constitui investimento financeiro, não promete rentabilidade e não representa participação societária.",
  },
  {
    title: "5. Elegibilidade",
    text: "Podem participar pessoas com 18 anos ou mais, CPF válido, dados verdadeiros, plena capacidade civil e conta individual e intransferível.",
  },
  {
    title: "6. Cadastro e conta",
    text: "Cada CPF está vinculado a uma única conta. É proibido compartilhar credenciais; o usuário é responsável pela guarda do login e pela atualização dos seus dados.",
  },
  {
    title: "7. Verificação de identidade (KYC)",
    text: "A plataforma pode solicitar selfie, documento com foto, comprovação de titularidade e biometria, podendo suspender funcionalidades até a conclusão do processo.",
  },
  {
    title: "8. Prevenção à fraude",
    text: "É vedada a criação de múltiplas contas, uso de cartões irregulares, bots ou qualquer tentativa de manipulação. A plataforma pode bloquear, investigar e cancelar acessos suspeitos.",
  },
  {
    title: "9. Funcionamento das seleções",
    text: "Cada seleção é uma campanha independente, com regras, valores, prazos e regulamento próprios, descritos na respectiva página antes da compra.",
  },
  {
    title: "10. Regulamento específico",
    text: "O regulamento de cada seleção prevalece sobre as disposições gerais destes termos no que for específico àquela campanha.",
  },
  {
    title: "11. Aquisição de acessos",
    text: "A disponibilidade, confirmação e limites de acessos por seleção seguem as regras publicadas na respectiva página, sujeitas a estoque e prazos de campanha.",
  },
  {
    title: "12. Pagamentos",
    text: "Pagamentos são processados via Pix (e outros métodos quando disponíveis) por meio de gateway homologado, sujeitos a aprovação, análise antifraude e eventuais falhas bancárias.",
  },
  {
    title: "13. Análise antifraude",
    text: "A aprovação de um pagamento não garante automaticamente a participação: compras podem passar por verificação complementar antes da confirmação final.",
  },
  {
    title: "14. Cancelamentos e estornos",
    text: "As condições de cancelamento e estorno são definidas conforme a etapa da seleção e a legislação aplicável, e estarão detalhadas no regulamento de cada campanha.",
  },
  {
    title: "15. Chargeback",
    text: "Contestações indevidas de pagamento podem ensejar bloqueio da conta e demais medidas cabíveis para proteção da plataforma e dos demais participantes.",
  },
  {
    title: "16. Contemplação",
    text: "O processo de apuração e contemplação segue o regulamento específico de cada seleção, com base em critério público e verificável (ex.: resultado da Loteria Federal).",
  },
  {
    title: "17. Entrega de prêmios e benefícios",
    text: "Prazos, custos, documentos exigidos e responsabilidades de entrega são detalhados no regulamento de cada seleção e acompanhados pela equipe Verita até a conclusão.",
  },
  {
    title: "18. Desclassificação",
    text: "Podem ensejar desclassificação: fraude comprovada, documentação falsa, pagamento irregular, CPF incompatível ou existência de múltiplas contas vinculadas ao mesmo usuário.",
  },
  {
    title: "19. Conduta do usuário",
    text: "É proibido realizar engenharia reversa, explorar falhas do sistema, automatizar ações ou tentar manipular resultados de qualquer seleção.",
  },
  {
    title: "20. Propriedade intelectual",
    text: "Marca, sistema, layout e identidade visual da Verita são protegidos e não podem ser reproduzidos sem autorização prévia.",
  },
  {
    title: "21. Disponibilidade da plataforma",
    text: "A Verita pode passar por manutenções programadas ou instabilidades técnicas pontuais, sem que isso configure descumprimento contratual.",
  },
  {
    title: "22. Limitação de responsabilidade",
    text: "A plataforma não responde por falhas de terceiros, instabilidade de internet, gateways de pagamento ou indisponibilidades temporárias alheias ao seu controle direto.",
  },
  {
    title: "23. Privacidade e proteção de dados",
    text: "O tratamento de dados pessoais (CPF, IP, geolocalização, dispositivo, logs de acesso) segue a Lei Geral de Proteção de Dados (LGPD) e a Política de Privacidade da Verita.",
  },
  {
    title: "24. Comunicações",
    text: "Ao se cadastrar, o usuário consente em receber comunicações por e-mail, SMS, WhatsApp e push notification relacionadas à sua conta e às seleções.",
  },
  {
    title: "25. Alteração dos termos",
    text: "Estes termos podem ser atualizados periodicamente. Alterações relevantes serão comunicadas com antecedência razoável.",
  },
  {
    title: "26. Suspensão ou encerramento de conta",
    text: "A plataforma pode suspender ou encerrar contas mediante motivo objetivo, sempre buscando comunicar o usuário sobre a razão da medida.",
  },
  {
    title: "27. Vigência",
    text: "Estes termos entram em vigor na data do aceite e permanecem válidos enquanto durar o vínculo entre o usuário e a plataforma.",
  },
  {
    title: "28. Resolução de conflitos",
    text: "Antes de qualquer medida formal, as partes buscarão solução amigável por meio dos canais de suporte da Verita.",
  },
  {
    title: "29. Legislação aplicável",
    text: "Estes termos são regidos pelas leis brasileiras, incluindo o Código de Defesa do Consumidor, no que for aplicável.",
  },
  {
    title: "30. Foro",
    text: "Fica eleito o foro do domicílio do usuário para dirimir eventuais controvérsias, quando aplicável a legislação consumerista.",
  },
];

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-10 space-y-3">
        <h1 className="text-3xl font-semibold">Termos e Condições de Uso</h1>
        <p className="text-muted text-sm">Última atualização: a definir</p>
        <div className="rounded-lg border border-gold/40 bg-surface p-4 text-sm text-muted">
          <strong className="text-foreground">Rascunho estrutural.</strong> Este
          documento é um esqueleto de referência e ainda não é a versão final
          publicada — precisa de revisão por advogado especializado antes de
          entrar em vigor, especialmente nos pontos sobre contemplação,
          pagamentos e proteção ao consumidor.
        </div>
        <p className="text-muted">
          Ao criar uma conta, acessar ou utilizar a plataforma Verita, o
          usuário declara ter lido, compreendido e aceitado integralmente
          estes Termos e Condições de Uso.
        </p>
      </div>

      <div className="space-y-8">
        {CLAUSES.map((clause) => (
          <div key={clause.title}>
            <h2 className="font-semibold mb-1.5">{clause.title}</h2>
            <p className="text-sm text-muted">{clause.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-border bg-surface p-6 text-sm text-muted">
        <p className="font-medium text-foreground mb-2">Anexos</p>
        <p>Anexo I — Política de Privacidade</p>
        <p>Anexo II — Política Antifraude</p>
        <p>Anexo III — Regras de Contemplação</p>
        <p>Anexo IV — Regulamento individual de cada seleção</p>
      </div>
    </div>
  );
}
