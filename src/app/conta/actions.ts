"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAuthEvent, getProfileRole } from "@/lib/auth-audit";

type FormState = { error?: string; ok?: string } | undefined;

const UF = /^[A-Z]{2}$/;

/**
 * Dados de recebimento do parceiro.
 *
 * A chave Pix é o único dado bancário do sistema, e ela existe para que a
 * EMPRESA pague diretamente — a plataforma não movimenta valor nenhum. A
 * escrita passa pelo cliente com RLS: a policy `parceiro edita o proprio
 * cadastro` garante que ninguém altere a chave de outra pessoa.
 */
export async function salvarDadosParceiro(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const chavePix = String(formData.get("chavePix") ?? "").trim();
  const cidade = String(formData.get("cidade") ?? "").trim();
  const uf = String(formData.get("uf") ?? "").trim().toUpperCase();
  const bio = String(formData.get("bio") ?? "").trim();

  if (uf && !UF.test(uf)) {
    return { error: "UF inválida — use a sigla de dois caracteres." };
  }

  const { error } = await supabase
    .from("parceiros")
    .update({
      chave_pix: chavePix || null,
      cidade: cidade || null,
      uf: uf || null,
      bio,
    })
    .eq("id", user.id);

  if (error) return { error: "Não foi possível salvar agora. Tente novamente." };

  const admin = createSupabaseAdminClient();
  await admin.from("audit_log").insert({
    actor_id: user.id,
    actor_role: "parceiro",
    action: "parceiro.dados_atualizados",
    target_table: "parceiros",
    target_id: user.id,
    // Nunca gravamos a chave em si no log — ela é dado pessoal, e o log é
    // append-only: um vazamento ali seria permanente.
    metadata: { chave_pix_definida: Boolean(chavePix), uf: uf || null },
  });

  revalidatePath("/conta");
  revalidatePath("/app");
  return { ok: "Dados atualizados." };
}

export async function alterarSenha(_prev: FormState, formData: FormData): Promise<FormState> {
  const novaSenha = String(formData.get("novaSenha") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");

  if (novaSenha.length < 8) {
    return { error: "A senha precisa ter pelo menos 8 caracteres." };
  }
  if (novaSenha !== confirmacao) {
    return { error: "As senhas não coincidem." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) {
    return { error: "Não foi possível alterar a senha. Ela pode ser fraca demais." };
  }

  await logAuthEvent({
    actorId: user.id,
    actorRole: await getProfileRole(supabase, user.id),
    action: "auth.password_changed",
  });

  return { ok: "Senha alterada." };
}
