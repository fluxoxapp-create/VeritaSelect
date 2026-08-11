import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader, Card, Pill, Campo } from "@/components/ui";
import { getSessao } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCnpj, formatDataHora } from "@/lib/format";
import { DadosParceiroForm, SenhaForm } from "./forms";

export const metadata: Metadata = { title: "Minha conta" };

export default async function ContaPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar?next=/conta");

  const supabase = await createSupabaseServerClient();

  const [{ data: parceiro }, { data: empresa }, { data: aceites }] = await Promise.all([
    sessao.parceiro
      ? supabase.from("parceiros").select("chave_pix, cidade, uf, bio, documento_last4, tipo_pessoa").eq("id", sessao.userId).maybeSingle()
      : Promise.resolve({ data: null }),
    sessao.empresa
      ? supabase.from("empresas").select("razao_social, cnpj, email_contato, representante_legal_nome").eq("id", sessao.empresa.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("aceites")
      .select("id, documento_tipo, documento_versao, conteudo_sha256, aceito_em")
      .order("aceito_em", { ascending: false }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <PageHeader titulo="Minha conta" descricao={sessao.email} />

      <Card className="mb-6">
        <h2 className="font-medium mb-2">Identificação</h2>
        <dl>
          <Campo label="Nome completo">{sessao.nomeCompleto}</Campo>
          <Campo label="E-mail">{sessao.email}</Campo>
          <Campo label="Papel">
            <div className="flex gap-2 flex-wrap">
              {sessao.parceiro && <Pill tom="gold">Parceiro</Pill>}
              {sessao.empresa && <Pill tom="gold">Empresa</Pill>}
              {sessao.papel === "admin" && <Pill tom="erro">Admin</Pill>}
            </div>
          </Campo>
          {parceiro && (
            <Campo label={parceiro.tipo_pessoa === "pj" ? "CNPJ" : "CPF"}>
              <span className="font-mono">•••• {parceiro.documento_last4}</span>
              <span className="text-muted text-xs block mt-1">
                O número não é gravado — guardamos apenas um hash com pepper de ambiente.
              </span>
            </Campo>
          )}
        </dl>
      </Card>

      {sessao.parceiro && parceiro && (
        <Card className="mb-6">
          <h2 className="font-medium mb-4">Dados de recebimento</h2>
          <DadosParceiroForm
            chavePix={(parceiro.chave_pix as string) ?? ""}
            cidade={(parceiro.cidade as string) ?? ""}
            uf={(parceiro.uf as string) ?? ""}
            bio={(parceiro.bio as string) ?? ""}
          />
        </Card>
      )}

      {sessao.empresa && empresa && (
        <Card className="mb-6">
          <h2 className="font-medium mb-2">Empresa</h2>
          <dl>
            <Campo label="Razão social">{empresa.razao_social as string}</Campo>
            <Campo label="CNPJ">
              <span className="font-mono">{formatCnpj(empresa.cnpj as string)}</span>
            </Campo>
            <Campo label="Representante legal">{empresa.representante_legal_nome as string}</Campo>
            <Campo label="E-mail de contato">{empresa.email_contato as string}</Campo>
            <Campo label="Verificação">
              <Pill
                tom={
                  sessao.empresa.kybStatus === "aprovada"
                    ? "ok"
                    : sessao.empresa.kybStatus === "reprovada"
                      ? "erro"
                      : "espera"
                }
              >
                {sessao.empresa.kybStatus === "aprovada"
                  ? "Aprovada"
                  : sessao.empresa.kybStatus === "reprovada"
                    ? "Reprovada"
                    : sessao.empresa.kybStatus === "pendente"
                      ? "Em análise"
                      : "Não enviada"}
              </Pill>
            </Campo>
          </dl>
        </Card>
      )}

      <Card className="mb-6">
        <h2 className="font-medium mb-2">Meus aceites</h2>
        <p className="text-sm text-muted mb-4">
          Cada aceite guarda o texto integral que você leu, congelado, com um hash SHA-256 que
          prova que ele não foi alterado depois. A tabela não aceita edição nem exclusão.
        </p>
        {!aceites?.length ? (
          <p className="text-sm text-muted">Nenhum aceite registrado ainda.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {aceites.map((a) => (
              <li key={a.id as string} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm">
                    {(a.documento_tipo as string).replace(/_/g, " ")}{" "}
                    <span className="text-muted text-xs">v{a.documento_versao as string}</span>
                  </span>
                  <span className="text-xs text-muted">{formatDataHora(a.aceito_em as string)}</span>
                </div>
                <p className="text-[10px] text-muted font-mono mt-1 break-all">
                  {a.conteudo_sha256 as string}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mb-6">
        <h2 className="font-medium mb-4">Senha</h2>
        <SenhaForm />
      </Card>

      <Card>
        <h2 className="font-medium">Seus direitos sobre os seus dados</h2>
        <p className="text-sm text-muted mt-2">
          Confirmação, acesso, correção, portabilidade e eliminação. Sobre dados de{" "}
          <strong className="text-foreground">leads que você registrou</strong>, quem responde é a
          empresa anunciante — ela é a controladora, nós somos operadores. Encaminhamos o pedido.
        </p>
        <p className="text-sm text-muted mt-2">
          O encarregado de dados (DPO) ainda não foi indicado — é item aberto da Fase 0. Até lá,
          pedidos passam pelo{" "}
          <Link href="/denuncia" className="text-gold-soft hover:text-gold">
            canal de contato
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
