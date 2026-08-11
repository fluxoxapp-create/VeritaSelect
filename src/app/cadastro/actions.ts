"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hashCpf, isValidCpf } from "@/lib/cpf";
import { checkAuthRateLimit } from "@/lib/rate-limit";

type FormState = { error?: string; redirectTo?: string } | undefined;

/**
 * Cadastro da pessoa natural dona da conta.
 *
 * Cria apenas `auth.users` + `profiles` (via trigger `handle_new_auth_user`).
 * O que a conta É — parceiro ou empresa — não vem daqui: `user_metadata` é o
 * que o cliente mandou, não o que a plataforma verificou. O papel efetivo
 * nasce no onboarding (`/app/comecar` ou `/empresa/comecar`), que grava a
 * linha em `parceiros` ou `empresa_usuarios` com auditoria.
 *
 * O parâmetro `perfil` serve só para escolher para onde mandar a pessoa
 * depois — não concede nada.
 */
export async function signUp(_prevState: FormState, formData: FormData): Promise<FormState> {
  const nomeCompleto = String(formData.get("nomeCompleto") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const cpf = String(formData.get("cpf") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const perfil = String(formData.get("perfil") ?? "parceiro");

  if (!nomeCompleto || !email || !cpf || !senha) {
    return { error: "Preencha todos os campos." };
  }
  if (nomeCompleto.split(/\s+/).length < 2) {
    return { error: "Informe o nome completo — ele precisa coincidir com o do seu documento." };
  }
  if (!isValidCpf(cpf)) {
    return { error: "CPF inválido. Confira os números digitados." };
  }
  if (senha.length < 8) {
    return { error: "A senha precisa ter pelo menos 8 caracteres." };
  }

  const allowed = await checkAuthRateLimit({
    action: "sign_up",
    identity: email,
    ipMax: 10,
    ipWindowSeconds: 60 * 60,
    identityMax: 5,
    identityWindowSeconds: 60 * 60,
  });
  if (!allowed) {
    return { error: "Muitas tentativas de cadastro. Aguarde alguns minutos." };
  }

  const { hash: cpfHash, last4: cpfLast4 } = await hashCpf(cpf);
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { full_name: nomeCompleto, cpf_hash: cpfHash, cpf_last4: cpfLast4 },
    },
  });

  if (error) {
    if (error.code === "user_already_exists") {
      return { error: "Já existe uma conta com este e-mail." };
    }
    if (error.message.toLowerCase().includes("password")) {
      return { error: "Senha fraca demais. Use ao menos 8 caracteres com letras e números." };
    }
    // A unique de profiles.cpf_hash estoura dentro do trigger de sign-up e
    // chega aqui como erro genérico de banco — traduzimos sem vazar schema.
    if (error.message.toLowerCase().includes("cpf_hash")) {
      return { error: "Este CPF já está cadastrado em outra conta." };
    }
    return { error: "Não foi possível criar sua conta agora. Tente novamente em instantes." };
  }

  return { redirectTo: perfil === "empresa" ? "/empresa/comecar" : "/app/comecar" };
}
