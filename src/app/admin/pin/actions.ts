"use server";

import { cookies } from "next/headers";
import {
  ADMIN_FINANCEIRO_COOKIE,
  checkFinanceiroPin,
  criarFinanceiroToken,
} from "@/lib/admin-financeiro-auth";
import { checkAuthRateLimit } from "@/lib/rate-limit";
import { getAdminEmail } from "@/lib/admin-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type FormState = { error?: string; redirectTo?: string } | undefined;

/**
 * Segundo fator para as rotas administrativas de maior impacto. Um PIN curto
 * só é defensável com limite de tentativas — sem isso são 10 mil combinações
 * que um script varre em segundos.
 */
export async function validarPin(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await getAdminEmail();
  if (!admin) return { error: "Sessão administrativa expirada. Entre novamente." };

  const pin = String(formData.get("pin") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  const permitido = await checkAuthRateLimit({
    action: "admin_pin",
    identity: admin,
    ipMax: 10,
    ipWindowSeconds: 15 * 60,
    identityMax: 5,
    identityWindowSeconds: 15 * 60,
  });
  if (!permitido) {
    return { error: "Muitas tentativas. Aguarde alguns minutos." };
  }

  if (!checkFinanceiroPin(pin)) {
    const supabase = createSupabaseAdminClient();
    await supabase.from("audit_log").insert({
      actor_id: null,
      actor_role: "admin",
      action: "admin.pin_invalido",
      target_table: null,
      metadata: { admin_email: admin, destino: next },
    });
    return { error: "PIN inválido." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_FINANCEIRO_COOKIE, await criarFinanceiroToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 2 * 60 * 60,
  });

  const destino = next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
  return { redirectTo: destino };
}
