import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireParceiro } from "@/lib/auth/session";
import { PageHeader, Card, Pill, EmptyState, BotaoLink } from "@/components/ui";
import { formatData } from "@/lib/format";
import { CERTIFICACAO_INFO, type CertificacaoStatus } from "@/lib/domain/certificacao";
import { QuestionarioForm, type QuestaoView } from "./questionario-form";

export const metadata: Metadata = { title: "Certificação de produto" };

export default async function CertificacaoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sessao = await requireParceiro();
  const supabase = await createSupabaseServerClient();

  const { data: campanhaData } = await supabase
    .from("campanhas")
    .select(
      "id, slug, titulo, produto, exige_certificacao, certificacao_material_url, empresas(nome_fantasia)",
    )
    .eq("slug", slug)
    .maybeSingle();

  const campanha = campanhaData as unknown as
    | {
        id: string;
        slug: string;
        titulo: string;
        produto: string;
        exige_certificacao: boolean;
        certificacao_material_url: string | null;
        empresas: { nome_fantasia: string } | null;
      }
    | null;

  if (!campanha) notFound();

  const { data: adesaoData } = await supabase
    .from("adesoes")
    .select("id, status, certificacao")
    .eq("campanha_id", campanha.id)
    .eq("parceiro_id", sessao.userId)
    .maybeSingle();

  const adesao = adesaoData as unknown as
    | { id: string; status: string; certificacao: CertificacaoStatus }
    | null;

  // As questões só são legíveis por quem aderiu (policy da 0023). Sem adesão
  // não há o que mostrar — e não há questionário a vazar.
  const { data: questoesData } = adesao
    ? await supabase
        .from("certificacao_questoes")
        .select("id, enunciado, ordem, certificacao_alternativas(id, texto, ordem)")
        .eq("campanha_id", campanha.id)
        .eq("ativa", true)
        .order("ordem")
    : { data: null };

  const questoes: QuestaoView[] = ((questoesData ?? []) as unknown as {
    id: string;
    enunciado: string;
    certificacao_alternativas: { id: string; texto: string; ordem: number }[];
  }[]).map((q) => ({
    id: q.id,
    enunciado: q.enunciado,
    alternativas: [...q.certificacao_alternativas].sort((a, b) => a.ordem - b.ordem),
  }));

  const { data: tentativas } = adesao
    ? await supabase
        .from("certificacao_tentativas")
        .select("id, concluida_em, acertos, total, aprovada")
        .eq("adesao_id", adesao.id)
        .order("iniciada_em", { ascending: false })
        .limit(5)
    : { data: null };

  const info = CERTIFICACAO_INFO[adesao?.certificacao ?? "nao_exigida"];

  return (
    <>
      <Link href="/app/campanhas" className="text-sm text-muted hover:text-foreground">
        ← Minhas campanhas
      </Link>

      <div className="mt-6">
        <PageHeader
          titulo="Certificação de produto"
          descricao={`${campanha.titulo} · ${campanha.empresas?.nome_fantasia ?? "—"}`}
          acao={<Pill tom={info.tom}>{info.label}</Pill>}
        />
      </div>

      {!adesao ? (
        <EmptyState
          titulo="Você ainda não aderiu a esta campanha"
          descricao="O material e o questionário ficam disponíveis depois da adesão."
          acao={
            <BotaoLink href={`/campanhas/${campanha.slug}`} variante="secundario" tamanho="sm">
              Ver campanha
            </BotaoLink>
          }
        />
      ) : !campanha.exige_certificacao ? (
        <EmptyState
          titulo="Esta campanha não pede certificação"
          descricao="Você já pode registrar indicações."
          acao={<BotaoLink href="/app/indicacoes/nova" tamanho="sm">Registrar indicação</BotaoLink>}
        />
      ) : (
        <div className="space-y-6">
          <Card>
            <p className="text-xs uppercase tracking-wide text-muted">Material de estudo</p>
            <p className="text-sm mt-2">
              Produto: <strong>{campanha.produto}</strong>
            </p>
            {campanha.certificacao_material_url ? (
              <a
                href={campanha.certificacao_material_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-2 text-sm px-4 py-2 mt-4 hover:border-gold/40 transition-colors"
              >
                Abrir material da empresa ↗
              </a>
            ) : (
              <p className="text-sm text-espera mt-3">
                A empresa ainda não publicou o material desta campanha. Você pode responder assim
                que ele estiver disponível.
              </p>
            )}
          </Card>

          {adesao.certificacao === "aprovada" ? (
            <Card className="border-ok/40">
              <p className="font-medium text-ok">Certificação concluída</p>
              <p className="text-sm text-muted mt-1.5">{info.significado}</p>
              <div className="mt-4">
                <BotaoLink href="/app/indicacoes/nova" tamanho="sm">
                  Registrar indicação
                </BotaoLink>
              </div>
            </Card>
          ) : questoes.length === 0 ? (
            <EmptyState
              titulo="Questionário ainda não publicado"
              descricao="A empresa precisa cadastrar as questões desta campanha. Enquanto isso, a certificação segue pendente e você não perde nada por esperar — não há prazo."
            />
          ) : (
            <QuestionarioForm adesaoId={adesao.id} questoes={questoes} />
          )}

          {tentativas && tentativas.length > 0 && (
            <Card>
              <p className="text-xs uppercase tracking-wide text-muted mb-3">Suas tentativas</p>
              <ul className="space-y-2 text-sm">
                {tentativas.map((t) => (
                  <li key={t.id as string} className="flex items-center justify-between gap-3">
                    <span className="text-muted">{formatData(t.concluida_em as string)}</span>
                    <span className={t.aprovada ? "text-ok" : "text-muted"}>
                      {t.acertos as number} de {t.total as number}
                      {t.aprovada ? " · concluída" : ""}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted mt-3">
                O histórico é seu. A empresa vê apenas se você está certificado ou não — nunca
                quantas tentativas levou.
              </p>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
