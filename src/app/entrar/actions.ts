"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfileRole, logAuthEvent, sanitizeAuditText } from "@/lib/auth-audit";
import { checkAuthRateLimit } from "@/lib/rate-limit";

type FormState = { error?: string; redirectTo?: string } | undefined;

export async function signIn(_prevState: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard").trim();

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

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

  // Return the redirect target — the client component does the navigation
  // so the session cookies set by signInWithPassword are already committed
  // before the redirect happens (avoids Next.js redirect() swallowing cookies).
  const redirectTo = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return { redirectTo };
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

  await supabase.auth.signOut();
  // Return instead of redirect() for the same reason — caller navigates
  return { redirectTo: "/" };
}
