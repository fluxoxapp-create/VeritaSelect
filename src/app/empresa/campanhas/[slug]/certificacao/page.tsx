import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireEmpresa } from "@/lib/auth/session";
import { PageHeader, Card, Pill, EmptyState } from "@/components/ui";
import { MIN_QUESTOES } from "@/lib/domain/certificacao";
import { MaterialForm, NovaQuestaoForm, RemoverQuestaoForm } from "./forms";

export const metadata: Metadata = { title: "Certificação da campanha" };

export default async function CertificacaoEmpresa({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sessao = await requireEmpresa();
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("campanhas")
    .select("id, slug, titulo, produto, exige_certificacao, certificacao_material_url")
    .eq("slug", slug)
    .eq("empresa_id", sessao.empresa.id)
    .maybeSingle();

  const campanha = data as unknown as
    | {
        id: string;
        slug: string;
        titulo: string;
        produto: string;
        exige_certificacao: boolean;
        certificacao_material_url: string | null;
      }
    | null;

  if (!campanha) notFound();

  // O gabarito não é concedido ao papel `authenticated` (0023 §4), então a
  // tela de gestão lê pelo cliente service-role — já escopado pelo id da
  // campanha que acabou de ser confirmada como desta empresa.
  const admin = createSupabaseAdminClient();
  const { data: questoesData } = await admin
    .from("certificacao_questoes")
    .select("id, enunciado, ordem, certificacao_alternativas(id, texto, correta, ordem)")
    .eq("campanha_id", campanha.id)
    .eq("ativa", true)
    .order("ordem");

  const questoes = (questoesData ?? []) as unknown as {
    id: string;
    enunciado: string;
    certificacao_alternativas: { id: string; texto: string; correta: boolean; ordem: number }[];
  }[];

  const incompleto = campanha.exige_certificacao && questoes.length < MIN_QUESTOES;

  return (
    <>
      <Link href="/empresa/campanhas" className="text-sm text-muted hover:text-foreground">
        ← Minhas campanhas
      </Link>

      <div className="mt-6">
        <PageHeader
          titulo="Certificação de produto"
          descricao={`${campanha.titulo} · ${campanha.produto}`}
          acao={
            campanha.exige_certificacao ? (
              <Pill tom={incompleto ? "espera" : "ok"}>
                {incompleto ? "Questionário incompleto" : "Exigida"}
              </Pill>
            ) : (
              <Pill>Não exigida</Pill>
            )
          }
        />
      </div>

      {incompleto && (
        <div className="rounded-lg border border-espera/40 bg-espera/5 px-4 py-3 text-sm text-espera/90 mb-6">
          Esta campanha exige certificação, mas tem {questoes.length} de {MIN_QUESTOES} questões
          mínimas. Enquanto o questionário não estiver publicado, quem aderir fica com a
          certificação pendente e <strong>não consegue indicar</strong>.
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <MaterialForm
            slug={campanha.slug}
            materialUrl={campanha.certificacao_material_url}
            exigeCertificacao={campanha.exige_certificacao}
          />
        </Card>

        <div>
          <h2 className="text-sm uppercase tracking-wide text-muted mb-4">
            Questionário ({questoes.length} {questoes.length === 1 ? "questão" : "questões"})
          </h2>

          {questoes.length === 0 ? (
            <EmptyState
              titulo="Nenhuma questão ainda"
              descricao={`Cadastre pelo menos ${MIN_QUESTOES} questões sobre o produto. Elas verificam se o parceiro sabe o que vai apresentar ao cliente — não servem para classificar parceiros.`}
            />
          ) : (
            <div className="space-y-3">
              {questoes.map((q, i) => (
                <Card key={q.id}>
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-medium text-sm">
                      {i + 1}. {q.enunciado}
                    </p>
                    <RemoverQuestaoForm slug={campanha.slug} questaoId={q.id} />
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {[...q.certificacao_alternativas]
                      .sort((a, b) => a.ordem - b.ordem)
                      .map((a) => (
                        <li
                          key={a.id}
                          className={`text-sm flex items-center gap-2 ${a.correta ? "text-ok" : "text-muted"}`}
                        >
                          <span aria-hidden>{a.correta ? "✓" : "○"}</span>
                          {a.texto}
                        </li>
                      ))}
                  </ul>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Card>
          <p className="font-medium text-sm mb-4">Nova questão</p>
          <NovaQuestaoForm slug={campanha.slug} />
        </Card>

        <p className="text-xs text-muted">
          O parceiro pode responder quantas vezes quiser, sem prazo e sem espera. Você vê apenas se
          ele está certificado nesta campanha — o número de tentativas é dele, e não fica visível
          para você.
        </p>
      </div>
    </>
  );
}
