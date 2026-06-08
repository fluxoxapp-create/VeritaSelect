"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfileRole, logAuthEvent } from "@/lib/auth-audit";

type FormState = { error?: string } | undefined;

/**
 * Completes a password reset.
 *
 * SECURITY: this does NOT accept an email/identifier from the client — it
 * acts exclusively on `auth.getUser()`, i.e. the session established by
 * /auth/callback after Supabase verified the one-time recovery token sent to
 * the account's registered e-mail. Without that verified session, there is
 * no signed-in user and the action refuses to proceed. This is what makes
 * the flow "processual": link → server verifies token → session → THEN the
 * password form is even reachable.
 */
export async function completePasswordReset(_prevState: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!password || !confirmPassword) {
    return { error: "Preencha os dois campos de senha." };
  }
  if (password.length < 8) {
    return { error: "A senha precisa ter pelo menos 8 caracteres." };
  }
  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "Este link de redefinição expirou ou já foi usado. Solicite um novo link em \"Esqueci minha senha\".",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    if (error.message.toLowerCase().includes("password")) {
      return { error: "Senha fraca demais. Use ao menos 8 caracteres com letras e números." };
    }
    return { error: "Não foi possível redefinir sua senha agora. Tente novamente em instantes." };
  }

  await logAuthEvent({
    actorId: user.id,
    actorRole: await getProfileRole(supabase, user.id),
    action: "auth.password_reset_completed",
  });

  // Recovery sessions are single-purpose: once the password is changed, end
  // this session too and force a fresh, normal sign-in with the new
  // credentials. This also avoids leaving a "recovery-flavoured" session
  // alive longer than it needs to exist.
  await supabase.auth.signOut();

  redirect("/entrar?redefinida=1");
}
