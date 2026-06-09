"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type State = { error: string | null; success?: boolean } | undefined;

export async function submitKyc(_prevState: State, formData: FormData): Promise<State> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const selfiePath = String(formData.get("selfiePath") ?? "").trim();
  const docFrontPath = String(formData.get("docFrontPath") ?? "").trim();
  const docBackPath = String(formData.get("docBackPath") ?? "").trim();

  if (!selfiePath) return { error: "Envie a selfie com o documento." };
  if (!docFrontPath) return { error: "Envie a frente do documento." };
  if (!docBackPath) return { error: "Envie o verso do documento." };

  const { error } = await supabase
    .from("organizers")
    .update({
      kyc_selfie_path: selfiePath,
      kyc_doc_front_path: docFrontPath,
      kyc_doc_back_path: docBackPath,
      kyc_submitted_at: new Date().toISOString(),
      kyc_status: "pending",
    })
    .eq("id", user.id);

  if (error) return { error: "Erro ao enviar verificação. Tente novamente." };

  revalidatePath("/organizador/kyc");
  return { error: null, success: true };
}
