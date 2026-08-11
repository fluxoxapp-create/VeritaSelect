import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Resolução de sessão e de TENANT.
 *
 * Convenção técnica 6 do AGENTS.md: o tenant vem sempre da sessão do
 * servidor, nunca do cliente. Nenhuma rota deve aceitar `empresaId` vindo de
 * query string, corpo de formulário ou header — a empresa é descoberta aqui,
 * a partir de `auth.uid()`, pela tabela `empresa_usuarios`.
 *
 * O papel também não vem de `user_metadata`: aquilo é o que o cliente mandou
 * no cadastro, não o que a plataforma verificou. A fonte é `profiles.role`.
 */

export type Papel = "parceiro" | "empresa" | "admin";

export type EmpresaSessao = {
  id: string;
  slug: string;
  nomeFantasia: string;
  razaoSocial: string;
  kybStatus: "nao_enviada" | "pendente" | "aprovada" | "reprovada";
  seloPendenciaPagamento: boolean;
  assinaturaAtiva: boolean;
  suspensaAte: string | null;
  responsavelPelaCampanha: boolean;
};

export type ParceiroSessao = {
  id: string;
  tipoPessoa: "pf" | "pj";
  temChavePix: boolean;
  uf: string | null;
};

export type Sessao = {
  userId: string;
  email: string;
  nomeCompleto: string;
  papel: Papel;
  banido: boolean;
  empresa: EmpresaSessao | null;
  parceiro: ParceiroSessao | null;
};

/**
 * Sessão completa, ou null se não há usuário autenticado. Nunca lança —
 * layouts públicos chamam isto só para decidir o que mostrar no cabeçalho.
 */
export async function getSessao(): Promise<Sessao | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role, is_banned")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) return null;

    const papel = (profile.role as Papel) ?? "parceiro";

    // Os dois lookups são independentes: uma conta pode, em tese, ter perfil
    // de parceiro e vínculo de empresa (ex.: sócio que também indica). O papel
    // decide o painel padrão; os dois objetos ficam disponíveis mesmo assim.
    const [vinculo, parceiro] = await Promise.all([
      supabase
        .from("empresa_usuarios")
        .select(
          "responsavel_pela_campanha, empresas(id, slug, nome_fantasia, razao_social, kyb_status, selo_pendencia_pagamento, assinatura_ativa, suspensa_ate)",
        )
        .eq("profile_id", user.id)
        .maybeSingle(),
      supabase
        .from("parceiros")
        .select("id, tipo_pessoa, chave_pix, uf")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    const e = vinculo.data?.empresas as unknown as
      | {
          id: string;
          slug: string;
          nome_fantasia: string;
          razao_social: string;
          kyb_status: EmpresaSessao["kybStatus"];
          selo_pendencia_pagamento: boolean;
          assinatura_ativa: boolean;
          suspensa_ate: string | null;
        }
      | undefined;

    return {
      userId: user.id,
      email: user.email,
      nomeCompleto: (profile.full_name as string) || user.email,
      papel,
      banido: Boolean(profile.is_banned),
      empresa: e
        ? {
            id: e.id,
            slug: e.slug,
            nomeFantasia: e.nome_fantasia,
            razaoSocial: e.razao_social,
            kybStatus: e.kyb_status,
            seloPendenciaPagamento: e.selo_pendencia_pagamento,
            assinaturaAtiva: e.assinatura_ativa,
            suspensaAte: e.suspensa_ate,
            responsavelPelaCampanha: Boolean(vinculo.data?.responsavel_pela_campanha),
          }
        : null,
      parceiro: parceiro.data
        ? {
            id: parceiro.data.id as string,
            tipoPessoa: parceiro.data.tipo_pessoa as "pf" | "pj",
            temChavePix: Boolean(parceiro.data.chave_pix),
            uf: (parceiro.data.uf as string | null) ?? null,
          }
        : null,
    };
  } catch {
    return null;
  }
}

/**
 * Área do parceiro. Redireciona quem não tem cadastro de parceiro.
 *
 * O onboarding mora FORA de /app (em /comecar/parceiro) de propósito: se
 * ficasse sob este layout, quem ainda não é parceiro entraria em laço de
 * redirecionamento com a própria página que resolveria o problema.
 */
export async function requireParceiro(): Promise<Sessao & { parceiro: ParceiroSessao }> {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar?next=/app");
  if (sessao.banido) redirect("/conta-suspensa");
  if (!sessao.parceiro) redirect("/comecar/parceiro");
  return sessao as Sessao & { parceiro: ParceiroSessao };
}

/** Área da empresa. Redireciona quem não tem vínculo com empresa. */
export async function requireEmpresa(): Promise<Sessao & { empresa: EmpresaSessao }> {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar?next=/empresa");
  if (sessao.banido) redirect("/conta-suspensa");
  if (!sessao.empresa) redirect("/comecar/empresa");
  return sessao as Sessao & { empresa: EmpresaSessao };
}
