import type { Metadata } from "next";
import { PageHeader, Card, Pill, EmptyState, AvisoFase0 } from "@/components/ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatData, diasAte } from "@/lib/format";
import { CONSELHO_LABEL, CORE_NAO_COLETADO, type Conselho } from "@/lib/domain/atividades";

export const metadata: Metadata = { title: "Habilitação profissional" };

type Habilitacao = {
  id: string;
  conselho: Conselho;
  numero: string;
  uf: string;
  validade: string;
  status: "nao_enviada" | "pendente" | "aprovada" | "reprovada";
  nome_no_registro: string;
  motivo_reprovacao: string | null;
  verificada_em: string | null;
  fonte_consultada: string | null;
};

const STATUS_PILL = {
  nao_enviada: { label: "Não enviada", tom: "neutro" },
  pendente: { label: "Em verificação", tom: "espera" },
  aprovada: { label: "Aprovada", tom: "ok" },
  reprovada: { label: "Reprovada", tom: "erro" },
} as const;

export default async function HabilitacaoPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("habilitacoes")
    .select(
      "id, conselho, numero, uf, validade, status, nome_no_registro, motivo_reprovacao, verificada_em, fonte_consultada",
    )
    .order("created_at", { ascending: false });

  const habilitacoes = (data ?? []) as unknown as Habilitacao[];

  return (
    <>
      <PageHeader
        titulo="Habilitação profissional"
        descricao="Algumas campanhas exigem credencial verificada. Não é banimento — é portão: com a credencial aprovada e vigente, o segmento abre para você."
      />

      <Card className="mb-6">
        <h2 className="font-medium">Quando a credencial é exigida</h2>
        <p className="text-sm text-muted mt-2">
          O que define a exigência é <strong className="text-foreground">o que você faz</strong>,
          não o setor do cliente. Indicar software para uma corretora é campanha livre; intermediar
          a apólice é campanha regulada.
        </p>
        <dl className="mt-4 space-y-3 text-sm">
          <Conselho_
            sigla="susep"
            segmentos="Seguros, previdência aberta, planos de saúde e odontológicos"
            escopo="Nacional"
          />
          <Conselho_
            sigla="creci"
            segmentos="Intermediação imobiliária"
            escopo="Estadual — atuar em outra UF exige visto ou inscrição secundária"
          />
          <Conselho_
            sigla="cvm"
            segmentos="Valores mobiliários e investimentos"
            escopo="Nacional, com vínculo a intermediário"
          />
        </dl>
        <p className="text-sm text-muted mt-4">
          <strong className="text-foreground">Crédito, empréstimo, meios de pagamento e
          consórcio permanecem fechados.</strong>{" "}
          Não é falta de campo no sistema: nesses segmentos não existe registro individual que
          você possa apresentar — correspondente bancário é contrato entre pessoa jurídica e
          instituição financeira, e consórcio é privativo de administradora autorizada pelo BACEN.
        </p>
      </Card>

      {habilitacoes.length === 0 ? (
        <EmptyState
          titulo="Nenhuma credencial enviada"
          descricao="Você só precisa disso para atuar em campanha regulada. Campanhas livres — software, serviços e produtos B2B — não exigem nada."
        />
      ) : (
        <div className="space-y-4 mb-6">
          {habilitacoes.map((h) => {
            const pill = STATUS_PILL[h.status];
            const dias = diasAte(h.validade);
            const vencendo = h.status === "aprovada" && dias !== null && dias <= 30;
            return (
              <Card key={h.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {CONSELHO_LABEL[h.conselho]} {h.numero}/{h.uf}
                      </p>
                      <Pill tom={pill.tom}>{pill.label}</Pill>
                    </div>
                    <p className="text-sm text-muted mt-1">Em nome de {h.nome_no_registro}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted">Validade</p>
                    <p className={`text-sm ${vencendo ? "text-espera" : ""}`}>
                      {formatData(h.validade)}
                    </p>
                  </div>
                </div>

                {h.status === "pendente" && (
                  <p className="text-sm text-muted mt-3">
                    Nossa equipe confere o registro na consulta pública do conselho em até 3 dias
                    úteis. A verificação confirma existência, titularidade, situação ativa e
                    validade — ela não atesta competência técnica nem idoneidade.
                  </p>
                )}

                {h.status === "aprovada" && (
                  <p className="text-xs text-muted mt-3">
                    Verificada em {formatData(h.verificada_em)}
                    {h.fonte_consultada ? ` · fonte: ${h.fonte_consultada}` : ""}
                  </p>
                )}

                {h.status === "reprovada" && h.motivo_reprovacao && (
                  <div className="mt-3 rounded-lg border border-erro/40 bg-erro/5 p-3">
                    <p className="text-sm text-erro">{h.motivo_reprovacao}</p>
                    <p className="text-xs text-muted mt-1.5">
                      Você pode corrigir e reenviar a documentação.
                    </p>
                  </div>
                )}

                {vencendo && (
                  <div className="mt-3">
                    <AvisoFase0>
                      Sua credencial vence {dias === 0 ? "hoje" : `em ${dias} dias`}. No
                      vencimento, o registro de <strong>novas</strong> indicações neste segmento é
                      bloqueado — as já registradas continuam valendo e geram comissão normalmente.
                    </AvisoFase0>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <h2 className="font-medium">Por que não pedimos seu CORE</h2>
        <p className="text-sm text-muted mt-2">{CORE_NAO_COLETADO}</p>
        <p className="text-sm text-muted mt-3">
          Credenciais neutras — OAB, CRC, CRA, certificações privadas — também não são exigidas
          nem liberam campanha. Você pode exibi-las no seu perfil como informação, sem efeito
          sobre acesso.
        </p>
      </Card>
    </>
  );
}

function Conselho_({
  sigla,
  segmentos,
  escopo,
}: {
  sigla: Conselho;
  segmentos: string;
  escopo: string;
}) {
  return (
    <div className="flex gap-4">
      <dt className="w-16 shrink-0 font-medium text-gold-soft">{CONSELHO_LABEL[sigla]}</dt>
      <dd className="text-muted">
        {segmentos}
        <span className="block text-xs mt-0.5">{escopo}</span>
      </dd>
    </div>
  );
}
