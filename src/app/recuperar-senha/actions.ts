"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAuthEvent, sanitizeAuditText } from "@/lib/auth-audit";
import { checkAuthRateLimit } from "@/lib/rate-limit";

type FormState = { sent?: boolean; error?: string } | undefined;

/**
 * Requests a password-recovery email via Supabase Auth.
 *
 * SECURITY: the response is intentionally identical whether or not the email
 * exists — returning a different message for "account not found" is a
 * classic enumeration oracle (an attacker can map which e-mails/CPFs have
 * accounts on the platform, which is itself sensitive personal data here).
 */
export async function requestPasswordReset(_prevState: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return { error: "Informe seu e-mail." };
  }

  // Same dual-bucket brute-force gate as sign-in. On a hit we still return
  // `{ sent: true }` below — the *generic* response is part of the
  // anti-enumeration design, and a distinct "rate limited" message would
  // itself leak whether an account exists (real accounts would more often
  // trip the per-identity bucket than addresses nobody ever requests resets for).
  const allowed = await checkAuthRateLimit({
    action: "password_recovery",
    identity: email,
    ipMax: 10,
    ipWindowSeconds: 10 * 60,
    identityMax: 3,
    identityWindowSeconds: 15 * 60,
  });
  if (!allowed) {
    return { sent: true };
  }

  const supabase = await createSupabaseServerClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/redefinir-senha`,
  });

  // Supabase returns an error for malformed input or rate limiting — but NOT
  // for "user not found" (it silently no-ops to avoid enumeration on its
  // side too). We log the attempt either way; we do not log success/failure
  // distinctly tied to whether the account exists.
  await logAuthEvent({
    actorId: null,
    actorRole: null,
    action: "auth.password_recovery_requested",
    metadata: { email_attempted: sanitizeAuditText(email), supabase_error: error ? sanitizeAuditText(error.message) : null },
  });

  if (error && error.status && error.status >= 500) {
    return { error: "Não foi possível processar o pedido agora. Tente novamente em instantes." };
  }

  return { sent: true };
}
