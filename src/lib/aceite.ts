import "server-only";
import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Motor de aceite eletrônico — convenção técnica 3 do AGENTS.md.
 *
 * O documento é RENDERIZADO, CONGELADO e HASHEADO no momento do aceite, com
 * IP, timestamp e versão. Nunca se guarda apenas um ponteiro para a URL viva:
 * o texto publicado muda, e em audiência o que vale é o que a pessoa leu
 * naquele instante. A tabela `aceites` tem trigger que impede UPDATE e DELETE.
 */

export type DocumentoAceitavel =
  | "termos_empresa"
  | "termos_parceiro"
  | "contrato_campanha"
  | "privacidade"
  | "dpa";

async function sha256Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Mesma extração de IP usada em auth-audit — advisory, nunca para autorização. */
async function clientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip");
}

export type ResultadoAceite = {
  id: string;
  sha256: string;
};

/**
 * Grava o aceite com a prova completa. Diferente do log de auditoria, este
 * NÃO é best-effort: se não conseguimos congelar a prova, o aceite não
 * aconteceu e o chamador precisa abortar a operação que dependia dele.
 */
export async function registrarAceite(params: {
  profileId: string;
  documentoTipo: DocumentoAceitavel;
  documentoVersao: string;
  /** Texto integral que foi exibido ao usuário, já resolvido. */
  conteudo: string;
  campanhaId?: string | null;
}): Promise<ResultadoAceite> {
  const sha256 = await sha256Hex(params.conteudo);
  const ip = await clientIp();
  const h = await headers();

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("aceites")
    .insert({
      profile_id: params.profileId,
      documento_tipo: params.documentoTipo,
      documento_versao: params.documentoVersao,
      campanha_id: params.campanhaId ?? null,
      conteudo_congelado: params.conteudo,
      conteudo_sha256: sha256,
      ip,
      user_agent: h.get("user-agent"),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Falha ao congelar o aceite: ${error?.message ?? "sem retorno"}`);
  }

  return { id: data.id as string, sha256 };
}

/**
 * Confere que um aceite guardado não foi adulterado. A tabela já é imutável
 * por trigger; isto detecta corrupção e serve de prova de integridade quando
 * o documento é apresentado a terceiro.
 */
export async function verificarIntegridade(aceiteId: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("aceites")
    .select("conteudo_congelado, conteudo_sha256")
    .eq("id", aceiteId)
    .maybeSingle();

  if (!data) return false;
  return (await sha256Hex(data.conteudo_congelado as string)) === data.conteudo_sha256;
}
