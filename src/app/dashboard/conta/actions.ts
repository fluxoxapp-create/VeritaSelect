"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRole, logAuthEvent, sanitizeAuditText } from "@/lib/auth-audit";
import { checkAuthRateLimit } from "@/lib/rate-limit";

/**
 * Re-authentication gate for sensitive account actions: bounded by user id
 * (a stolen session cookie shouldn't let an attacker brute-force the current
 * password indefinitely) and by IP (catches the same attacker rotating
 * accounts). Shared by changePassword and requestEmailChange — both demand
 * fresh proof of the current password before mutating account-recovery
 * surface area.
 */
async function checkReauthRateLimit(userId: string) {
  return checkAuthRateLimit({
    action: "reauth",
    identity: userId,
    ipMax: 30,
    ipWindowSeconds: 10 * 60,
    identityMax: 5,
    identityWindowSeconds: 15 * 60,
  });
}

type FormState = { error?: string; success?: string } | undefined;

/**
 * Changes the signed-in user's password.
 *
 * SECURITY — "re-authentication" gate: Supabase's server-side session does
 * not let us cheaply check "is this the real owner acting right now" beyond
 * "is the access token valid". A stolen/idle session cookie would otherwise
 * be enough to take over the account permanently by just setting a new
 * password. We close that gap by re-running `signInWithPassword` with the
 * CURRENT password before allowing `updateUser`. This mirrors the layer-2
 * principle: sensitive actions need fresh proof of identity, not just an
 * existing session.
 */
export async function changePassword(_prevState: FormState, formData: FormData): Promise<FormState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Preencha todos os campos." };
  }
  if (newPassword.length < 8) {
    return { error: "A nova senha precisa ter pelo menos 8 caracteres." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "A confirmação não coincide com a nova senha." };
  }
  if (newPassword === currentPassword) {
    return { error: "A nova senha precisa ser diferente da senha atual." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "Sua sessão expirou. Entre novamente para alterar a senha." };
  }

  // Capture the CALLER's session before re-authenticating — signInWithPassword
  // below issues (and persists, via the cookie adapter) a brand-new session as
  // a side effect of succeeding. If we read getSession() *after* that call, the
  // "preserve this device" token passed to admin.signOut(..., "others") would
  // be the freshly-minted re-auth session rather than the one the user actually
  // arrived with — harmless in the common case, but a real risk under
  // concurrent requests (the wrong session could end up preserved or revoked).
  const {
    data: { session: callerSession },
  } = await supabase.auth.getSession();

  if (!(await checkReauthRateLimit(user.id))) {
    return { error: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente." };
  }

  // Re-authentication: prove the caller knows the CURRENT password before
  // anything is changed. signInWithPassword also naturally rate-limits via
  // Supabase Auth's own brute-force protections.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) {
    await logAuthEvent({
      actorId: user.id,
      actorRole: await getProfileRole(supabase, user.id),
      action: "auth.password_changed",
      metadata: { result: "reauth_failed" },
    });
    return { error: "Senha atual incorreta." };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    if (updateError.message.toLowerCase().includes("password")) {
      return { error: "Senha fraca demais. Use ao menos 8 caracteres com letras e números." };
    }
    return { error: "Não foi possível alterar sua senha agora. Tente novamente em instantes." };
  }

  await logAuthEvent({
    actorId: user.id,
    actorRole: await getProfileRole(supabase, user.id),
    action: "auth.password_changed",
    metadata: { result: "success" },
  });

  // updateUser({ password }) rotates the current session's own refresh
  // token, but other devices/sessions stay alive on their own tokens until
  // they expire naturally. The admin API's signOut(jwt, 'others') revokes
  // every OTHER session belonging to the same user as the supplied access
  // token, while preserving this one — exactly the "kick everyone else out"
  // behaviour a password change should trigger (closes the door on any
  // session an attacker might be holding without logging the legitimate
  // user out of the device they're using right now).
  try {
    if (callerSession?.access_token) {
      const admin = createSupabaseAdminClient();
      await admin.auth.admin.signOut(callerSession.access_token, "others");
    }
  } catch {
    // Best-effort — never fail the password change because the cleanup step
    // had trouble; the new password is already set, which is the priority.
  }

  revalidatePath("/dashboard/conta");
  return { success: "Senha alterada com sucesso. Suas outras sessões foram encerradas por segurança." };
}

/**
 * Requests an email change.
 *
 * SECURITY — double opt-in: this calls `updateUser({ email })`, which (when
 * the project's "Secure email change" setting is enabled in the Supabase
 * dashboard — see deployment notes) sends confirmation links to BOTH the
 * current and the new address, and only applies the change once both are
 * confirmed. We never write `profiles`/`auth.users.email` directly — that
 * would be a silent, unverified change and a textbook account-takeover
 * vector (attacker changes email, then uses "forgot password" against the
 * new address they control).
 */
export async function requestEmailChange(_prevState: FormState, formData: FormData): Promise<FormState> {
  const newEmail = String(formData.get("newEmail") ?? "").trim().toLowerCase();
  const currentPassword = String(formData.get("currentPassword") ?? "");

  if (!newEmail || !currentPassword) {
    return { error: "Informe o novo e-mail e sua senha atual." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return { error: "Informe um e-mail válido." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "Sua sessão expirou. Entre novamente para alterar o e-mail." };
  }
  if (newEmail === user.email.toLowerCase()) {
    return { error: "Esse já é o e-mail cadastrado na sua conta." };
  }

  if (!(await checkReauthRateLimit(user.id))) {
    return { error: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente." };
  }

  // Re-authentication gate, same rationale as changePassword: an email
  // change is functionally equivalent to a password change for account
  // recovery purposes (whoever controls the email controls "forgot
  // password"), so it deserves the same fresh proof of identity.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) {
    return { error: "Senha atual incorreta." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    { emailRedirectTo: `${siteUrl}/auth/callback?next=/dashboard/conta` },
  );

  // SECURITY — no enumeration oracle: whether or not `newEmail` already
  // belongs to another account, we show the exact same success message and
  // log the same event. Branching on "email_exists" here would let an
  // authenticated attacker probe arbitrary addresses for registered accounts
  // simply by trying to "change" their own email to each candidate in turn —
  // worse than the classic signup-form oracle, since it requires no guesswork
  // about which form triggers the check.
  if (error && error.code !== "email_exists" && !error.message.toLowerCase().includes("already")) {
    return { error: "Não foi possível solicitar a troca de e-mail agora. Tente novamente em instantes." };
  }

  await logAuthEvent({
    actorId: user.id,
    actorRole: await getProfileRole(supabase, user.id),
    action: "auth.email_change_requested",
    metadata: { from: user.email, to: sanitizeAuditText(newEmail), result: error ? "target_exists" : "sent" },
  });

  return {
    success:
      "Se o endereço informado puder receber a troca, enviamos um link de confirmação para o seu " +
      "e-mail atual e para o novo e-mail. A troca só é concluída depois que AMBOS confirmarem — " +
      "assim garantimos que você (e não outra pessoa) está autorizando essa mudança.",
  };
}
