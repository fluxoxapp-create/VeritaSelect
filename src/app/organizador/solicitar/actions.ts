"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidCpf } from "@/lib/cpf";
import { hashDocumentNumber, isValidCnpj } from "@/lib/documento";

type FormState = { error?: string } | undefined;

export async function requestOrganizerVerification(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const documentType = String(formData.get("documentType") ?? "");
  const documentNumber = String(formData.get("documentNumber") ?? "");

  if (!displayName || !documentType || !documentNumber) {
    return { error: "Preencha todos os campos." };
  }
  if (documentType !== "cpf" && documentType !== "cnpj") {
    return { error: "Selecione o tipo de documento." };
  }
  if (documentType === "cpf" && !isValidCpf(documentNumber)) {
    return { error: "CPF inválido. Confira os números digitados." };
  }
  if (documentType === "cnpj" && !isValidCnpj(documentNumber)) {
    return { error: "CNPJ inválido. Confira os números digitados." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const documentNumberHash = await hashDocumentNumber(documentNumber);

  const { data: existing } = await supabase
    .from("organizers")
    .select("kyc_status")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("organizers")
        .update({
          display_name: displayName,
          document_type: documentType,
          document_number_hash: documentNumberHash,
          kyc_status: "pending",
          kyc_rejection_reason: null,
        })
        .eq("id", user.id)
    : await supabase.from("organizers").insert({
        id: user.id,
        display_name: displayName,
        document_type: documentType,
        document_number_hash: documentNumberHash,
        kyc_status: "pending",
        document_storage_paths: [],
      });

  if (error) {
    if (error.code === "23505") {
      if (error.message.toLowerCase().includes("document_number_unique")) {
        return { error: "Este documento já está cadastrado em outra conta de organizador." };
      }
      return { error: "Você já enviou uma solicitação de verificação." };
    }
    return { error: "Não foi possível enviar sua solicitação agora. Tente novamente em instantes." };
  }

  redirect("/organizador");
}
