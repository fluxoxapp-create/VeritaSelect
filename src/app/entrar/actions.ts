"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfileRole, logAuthEvent, sanitizeAuditText } from "@/lib/auth-audit";
import { checkAuthRateLimit } from "@/lib/rate-limit";

type FormState = { error?: string } | undefined;

export async function signIn(_prevState: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  // Brute-force gate: one bucket per source IP (catches credential stuffing
  // across many accounts) and one per attempted email (catches a single
  // account being hammered from many addresses). Supabase Auth itself rate-
  // limits sign-ins, but that's a global default we don't control — this is
  // the per-account/per-IP layer the appsec review asked for.
  const allowed = await checkAuthRateLimit({
    action: "sign_in",
    identity: email,
    ipMax: 20,
    ipWindowSeconds: 5 * 60,
    identityMax: 8,
    identityWindowSeconds: 15 * 60,
  });
  if (!allowed) {
    return { error: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Logged with no actor_id (we deliberately don't look the email up — that
    // would itself be an enumeration oracle) so failed attempts are still
    // visible in aggregate for brute-force detection without identifying the
    // target account from the log entry alone.
    await logAuthEvent({
      actorId: null,
      actorRole: null,
      action: "auth.sign_in_failed",
      metadata: { email_attempted: sanitizeAuditText(email) },
    });
    return { error: "E-mail ou senha inválidos." };
  }

  await logAuthEvent({
    actorId: data.user.id,
    actorRole: await getProfileRole(supabase, data.user.id),
    action: "auth.sign_in",
  });

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await logAuthEvent({
      actorId: user.id,
      actorRole: await getProfileRole(supabase, user.id),
      action: "auth.sign_out",
    });
  }

  // signOut() revokes the refresh token server-side (not just clearing the
  // cookie) — the session is dead in Supabase Auth, not just locally.
  await supabase.auth.signOut();
  redirect("/");
}
