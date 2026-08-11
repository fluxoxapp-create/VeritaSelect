"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireEmpresa } from "@/lib/auth/session";
import { PRAZOS_FIXOS } from "@/lib/domain/indicacoes";

type FormState = { error?: string; ok?: string } | undefined;

/**
 * Resposta da empresa à contestação — política 06 §7.
 *
 * O silêncio por {respostaEmpresaDias} dias implica PROCEDÊNCIA da
 * contestação. Por isso o prazo é barrado aqui: aceitar resposta atrasada
 * reabriria uma questão que a política já deu por resolvida contra a empresa,
 * e o parceiro perderia um direito que já tinha adquirido pelo decurso.
 *
 * A escrita passa pelo cliente RLS-scoped: a policy
 * "empresa responde disputa recebida" decide quais linhas, e os grants de
 * coluna da migration 0022 decidem quais campos — a empresa não alcança
 * `decisao`, que é ato da plataforma.
 */
export async function responderDisputa(_prev: FormState, formData: FormData): Promise<FormState> {
  const sessao = await requireEmpresa();
  const disputaId = String(formData.get("disputaId") ?? "");
  const resposta = String(formData.get("resposta") ?? "").trim();

  if (!disputaId) return { error: "Disputa não informada." };
  if (resposta.length < 30) {
    return {
      error:
        "Responda com pelo menos 30 caracteres e aponte a prova. Recusa por lead preexistente, por exemplo, exige documento DATADO DE ANTES do registro da indicação.",
    };
  }

  const supabase = await createSupabaseServerClient();

  // A policy "partes leem a disputa" já restringe ao próprio tenant.
  const { data: disputa } = await supabase
    .from("disputas")
    .select("id, prazo_resposta_em, respondida_em, decidida_em, indicacoes(id, empresa_id)")
    .eq("id", disputaId)
    .maybeSingle();

  const registro = disputa as unknown as
    | {
        id: string;
        prazo_resposta_em: string;
        respondida_em: string | null;
        decidida_em: string | null;
        indicacoes: { id: string; empresa_id: string } | null;
      }
    | null;

  if (!registro) return { error: "Disputa não encontrada." };
  if (registro.decidida_em) return { error: "Esta disputa já foi decidida." };
  if (registro.respondida_em) return { error: "Esta disputa já foi respondida." };

  if (new Date() > new Date(registro.prazo_resposta_em)) {
    return {
      error: `O prazo de ${PRAZOS_FIXOS.respostaEmpresaDias} dias para responder venceu. Pela política de comissionamento, o silêncio implica procedência da contestação — a plataforma decidirá com base no que já está nos autos.`,
    };
  }

  const agora = new Date().toISOString();
  const { data: gravadas, error } = await supabase
    .from("disputas")
    .update({
      resposta_empresa: resposta,
      respondida_em: agora,
      respondida_por: sessao.userId,
    })
    .eq("id", disputaId)
    .is("respondida_em", null)
    .select("id");

  if (error) return { error: "Não foi possível registrar a resposta agora. Tente novamente." };
  if (!gravadas?.length) return { error: "Esta disputa já foi respondida." };

  const admin = createSupabaseAdminClient();
  await admin.from("audit_log").insert({
    actor_id: sessao.userId,
    actor_role: "empresa",
    action: "disputa.respondida",
    target_table: "disputas",
    target_id: disputaId,
    metadata: {
      empresa_id: sessao.empresa.id,
      indicacao_id: registro.indicacoes?.id ?? null,
      dentro_do_prazo: true,
    },
  });

  revalidatePath("/empresa/disputas");
  revalidatePath("/admin/disputas");
  return {
    ok: "Resposta registrada. A plataforma decide em até 10 dias úteis e informa os dois lados.",
  };
}
