"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkAuthRateLimit } from "@/lib/rate-limit";
import { MOTIVOS_DENUNCIA } from "@/lib/domain/denuncias";

type FormState = { error?: string; ok?: string } | undefined;

export async function registrarDenuncia(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Entre na sua conta para registrar uma denúncia com acompanhamento." };
  }

  const motivo = String(formData.get("motivo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const campanhaSlug = String(formData.get("campanha") ?? "").trim();

  if (!(MOTIVOS_DENUNCIA as readonly string[]).includes(motivo)) {
    return { error: "Escolha um motivo." };
  }
  if (descricao.length < 30) {
    return {
      error: "Descreva o ocorrido com pelo menos 30 caracteres — sem detalhe não há como apurar.",
    };
  }

  const permitido = await checkAuthRateLimit({
    action: "denuncia",
    identity: user.id,
    ipMax: 10,
    ipWindowSeconds: 60 * 60,
    identityMax: 5,
    identityWindowSeconds: 60 * 60,
  });
  if (!permitido) {
    return { error: "Muitas denúncias enviadas. Aguarde antes de registrar outra." };
  }

  let campanhaId: string | null = null;
  if (campanhaSlug) {
    const { data } = await supabase
      .from("campanhas_public")
      .select("id")
      .eq("slug", campanhaSlug)
      .maybeSingle();
    campanhaId = (data?.id as string) ?? null;
  }

  const { error } = await supabase.from("denuncias").insert({
    campanha_id: campanhaId,
    denunciante_id: user.id,
    motivo,
    descricao,
  });

  if (error) return { error: "Não foi possível registrar a denúncia agora. Tente novamente." };

  const admin = createSupabaseAdminClient();
  await admin.from("audit_log").insert({
    actor_id: user.id,
    actor_role: null,
    action: "denuncia.registrada",
    target_table: "denuncias",
    metadata: { motivo, campanha_id: campanhaId },
  });

  return {
    ok: "Denúncia registrada. Nossa equipe responde em até 48 horas, e a campanha pode ser suspensa enquanto a apuração corre.",
  };
}

