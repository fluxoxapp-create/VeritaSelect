import type { Metadata } from "next";
import { PageHeader, Card, Pill, EmptyState, BotaoLink } from "@/components/ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatData } from "@/lib/format";

export const metadata: Metadata = { title: "Parceiros" };

type Adesao = {
  id: string;
  status: "ativa" | "encerrada";
  certificacao: "nao_exigida" | "pendente" | "aprovada" | "reprovada";
  aderida_em: string;
  campanhas: { titulo: string } | null;
  parceiros: {
    id: string;
    tipo_pessoa: "pf" | "pj";
    chave_pix: string | null;
    cidade: string | null;
    uf: string | null;
    profiles: { full_name: string } | null;
  } | null;
};

export default async function ParceirosEmpresa() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("adesoes")
    .select(
      "id, status, certificacao, aderida_em, campanhas(titulo), parceiros(id, tipo_pessoa, chave_pix, cidade, uf, profiles(full_name))",
    )
    .order("aderida_em", { ascending: false });

  const adesoes = (data ?? []) as unknown as Adesao[];

  return (
    <>
      <PageHeader
        titulo="Parceiros credenciados"
        descricao="Quem aderiu às suas campanhas. São profissionais autônomos — não há jornada, meta individual, exclusividade ou subordinação. Tratar como equipe própria caracteriza vínculo."
      />

      <Card className="mb-6">
        <p className="text-sm text-muted">
          A chave Pix aparece aqui porque{" "}
          <strong className="text-foreground">quem paga a comissão é você</strong>, diretamente ao
          parceiro. A plataforma não custodia nem repassa valores.
        </p>
      </Card>

      {adesoes.length === 0 ? (
        <EmptyState
          titulo="Nenhum parceiro ainda"
          descricao="Publique uma campanha para que parceiros possam aderir. Você não recruta ninguém — eles escolhem onde atuar."
          acao={<BotaoLink href="/empresa/campanhas/nova" variante="secundario" tamanho="sm">Criar campanha</BotaoLink>}
        />
      ) : (
        <div className="space-y-3">
          {adesoes.map((a) => (
            <Card key={a.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">
                      {a.parceiros?.profiles?.full_name ?? "Parceiro"}
                    </p>
                    <Pill tom={a.status === "ativa" ? "ok" : "neutro"}>
                      {a.status === "ativa" ? "Adesão ativa" : "Encerrada"}
                    </Pill>
                    <Pill>{a.parceiros?.tipo_pessoa === "pj" ? "PJ" : "PF"}</Pill>
                    {a.certificacao === "pendente" && (
                      <Pill tom="espera">Certificação pendente</Pill>
                    )}
                  </div>
                  <p className="text-sm text-muted mt-1">
                    {a.campanhas?.titulo ?? "—"}
                    {a.parceiros?.cidade
                      ? ` · ${a.parceiros.cidade}${a.parceiros.uf ? `/${a.parceiros.uf}` : ""}`
                      : ""}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Aderiu em {formatData(a.aderida_em)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted">Chave Pix</p>
                  <p className="text-sm font-mono">
                    {a.parceiros?.chave_pix ?? <span className="text-espera">não informada</span>}
                  </p>
                  {a.parceiros?.tipo_pessoa === "pj" && (
                    <p className="text-xs text-muted mt-1">pagamento mediante nota fiscal</p>
                  )}
                  {a.parceiros?.tipo_pessoa === "pf" && (
                    <p className="text-xs text-muted mt-1">retenções por sua conta</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
