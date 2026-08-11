import type { Metadata } from "next";
import { PageHeader, Card, BotaoLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Segurança e transparência",
  description:
    "Como os dados de lead ficam isolados entre empresas, por que a plataforma não toca no dinheiro e o que o log de auditoria registra.",
};

export default function SegurancaPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <PageHeader
        titulo="Segurança e transparência"
        descricao="O que fazemos para que a resposta a 'isso é sério?' esteja nos mecanismos, não na nossa palavra."
      />

      <Card className="mb-6">
        <h2 className="font-medium">Nenhum lead atravessa de uma empresa para outra</h2>
        <p className="text-sm text-muted mt-2">
          O isolamento entre empresas é feito no banco de dados, com Row Level Security ligada
          desde a primeira migration. Cada consulta é filtrada pelo Postgres a partir da sessão
          do servidor — a empresa nunca é identificada por algo que o navegador envia.
        </p>
        <p className="text-sm text-muted mt-2">
          Na prática: mesmo que uma rota da aplicação esquecesse um filtro, o banco recusaria a
          leitura. O isolamento não depende de ninguém lembrar do <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">where</code>.
        </p>
      </Card>

      <Card className="mb-6">
        <h2 className="font-medium">A plataforma nunca toca no dinheiro</h2>
        <p className="text-sm text-muted mt-2">
          A empresa paga a comissão diretamente ao parceiro. Não existe carteira, saldo, escrow,
          saque ou integração de repasse — e isso não é uma promessa de conduta, é ausência de
          estrutura: essas tabelas não existem no sistema.
        </p>
        <p className="text-sm text-muted mt-2">
          O motivo é jurídico antes de ser técnico. Custodiar dinheiro de terceiro é atividade de
          instituição de pagamento, com todo o regime regulatório que vem junto. Não é o nosso
          negócio, então não construímos a porta.
        </p>
      </Card>

      <Card className="mb-6">
        <h2 className="font-medium">Log de auditoria que ninguém consegue apagar</h2>
        <p className="text-sm text-muted mt-2">
          Toda transição de status é registrada com autor, papel, IP e horário. A tabela tem
          gatilho no banco que rejeita qualquer alteração ou exclusão — nem a aplicação, nem a
          chave de serviço, nem um administrador conseguem reescrever um evento.
        </p>
        <p className="text-sm text-muted mt-2">
          É requisito legal, não observabilidade opcional: o Marco Civil da Internet exige guarda
          de registros de acesso por seis meses. Para disputa de comissão, esse log é a prova de
          maior peso.
        </p>
      </Card>

      <Card className="mb-6">
        <h2 className="font-medium">Aceite eletrônico com prova</h2>
        <p className="text-sm text-muted mt-2">
          Quando alguém aceita um contrato, o texto exato é congelado, hasheado em SHA-256 e
          gravado com IP, data, hora e versão. Nada aponta para uma URL viva.
        </p>
        <p className="text-sm text-muted mt-2">
          Documentos publicados mudam com o tempo. Se houver discussão sobre o que foi combinado,
          o que vale é o texto que a pessoa leu naquele instante — e é exatamente ele que fica
          guardado, em tabela imutável.
        </p>
      </Card>

      <Card className="mb-6">
        <h2 className="font-medium">Dados pessoais: quem responde pelo quê</h2>
        <p className="text-sm text-muted mt-2">
          Os dados do lead são <strong className="text-foreground">da empresa anunciante</strong>,
          que é a controladora. A plataforma é operadora: fornece a ferramenta e o isolamento,
          mas não decide finalidade nem base legal do tratamento daquele contato.
        </p>
        <p className="text-sm text-muted mt-2">
          Pedidos de titular sobre dados de lead são encaminhados à empresa controladora. Sobre
          dados de conta — nome, CPF, credenciais profissionais — a controladora somos nós. O CPF
          nunca é gravado: guardamos apenas um hash com pepper de ambiente.
        </p>
        <p className="text-sm text-muted mt-2">
          Documentos de credencial profissional ficam em armazenamento privado, com todo acesso
          registrado.
        </p>
      </Card>

      <Card className="mb-6">
        <h2 className="font-medium">Indicadores públicos por empresa</h2>
        <p className="text-sm text-muted mt-2">
          Taxa de aprovação, prazo médio de pagamento e pendências financeiras ativas aparecem no
          perfil de cada empresa. São fatos objetivos apurados pela plataforma, e a publicação
          deles integra os Termos que a empresa aceitou.
        </p>
        <p className="text-sm text-muted mt-2">
          Empresa com comissão em atraso recebe selo público de pendência de pagamento visível em
          todas as suas campanhas — antes de qualquer parceiro investir tempo nelas.
        </p>
      </Card>

      <Card className="mb-6">
        <h2 className="font-medium">Estado atual — sem maquiagem</h2>
        <p className="text-sm text-muted mt-2">
          A plataforma está em construção. A fundação jurídica existe em rascunho e ainda não foi
          revisada por advogado; a pessoa jurídica não está constituída; as faixas de taxa não
          foram definidas; o encarregado de dados (DPO) ainda não foi indicado.
        </p>
        <p className="text-sm text-muted mt-2">
          Enquanto isso não fecha, os documentos aparecem marcados como rascunho e os valores
          pendentes aparecem como pendentes. Preferimos mostrar o marcador a inventar o número.
        </p>
      </Card>

      <div className="flex flex-wrap gap-3">
        <BotaoLink href="/termos" variante="secundario">
          Ler os documentos
        </BotaoLink>
        <BotaoLink href="/denuncia" variante="secundario">
          Canal de denúncia
        </BotaoLink>
      </div>
    </div>
  );
}
