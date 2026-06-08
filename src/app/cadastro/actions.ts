"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hashCpf, isValidCpf } from "@/lib/cpf";
import { normalizeCep, validateEndereco } from "@/lib/endereco";

type FormState = { error?: string } | undefined;

export async function signUp(_prevState: FormState, formData: FormData): Promise<FormState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const cpf = String(formData.get("cpf") ?? "");
  const password = String(formData.get("password") ?? "");

  const endereco = {
    cep: normalizeCep(String(formData.get("cep") ?? "")),
    logradouro: String(formData.get("logradouro") ?? "").trim(),
    numero: String(formData.get("numero") ?? "").trim(),
    complemento: String(formData.get("complemento") ?? "").trim(),
    bairro: String(formData.get("bairro") ?? "").trim(),
    cidade: String(formData.get("cidade") ?? "").trim(),
    uf: String(formData.get("uf") ?? "").trim().toUpperCase(),
  };

  if (!fullName || !email || !cpf || !password) {
    return { error: "Preencha todos os campos." };
  }
  if (!isValidCpf(cpf)) {
    return { error: "CPF inválido. Confira os números digitados." };
  }
  if (password.length < 8) {
    return { error: "A senha precisa ter pelo menos 8 caracteres." };
  }
  const enderecoError = validateEndereco(endereco);
  if (enderecoError) {
    return { error: enderecoError };
  }

  const { hash: cpfHash, last4: cpfLast4 } = await hashCpf(cpf);
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        cpf_hash: cpfHash,
        cpf_last4: cpfLast4,
        cep: endereco.cep,
        logradouro: endereco.logradouro,
        numero: endereco.numero,
        complemento: endereco.complemento || null,
        bairro: endereco.bairro,
        cidade: endereco.cidade,
        uf: endereco.uf,
      },
    },
  });

  if (error) {
    if (error.code === "user_already_exists") {
      return { error: "Já existe uma conta com este e-mail." };
    }
    if (error.message.toLowerCase().includes("password")) {
      return { error: "Senha fraca demais. Use ao menos 8 caracteres com letras e números." };
    }
    // The profiles.cpf_hash unique constraint rejects the insert inside the
    // on-signup trigger, which surfaces here as a generic database error —
    // translate it so the message stays meaningful (and doesn't leak schema details).
    if (error.message.toLowerCase().includes("cpf_hash")) {
      return { error: "Este CPF já está cadastrado em outra conta." };
    }
    return { error: "Não foi possível criar sua conta agora. Tente novamente em instantes." };
  }

  redirect("/dashboard");
}
