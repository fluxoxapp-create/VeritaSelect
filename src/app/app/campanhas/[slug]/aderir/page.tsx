import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireParceiro } from "@/lib/auth/session";
import { montarContrato, type DadosContrato } from "@/lib/domain/contrato-campanha";
import { AderirForm } from "./aderir-form";

export const metadata: Metadata = { title: "Aderir à campanha" };

export default async function AderirPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sessao = await requireParceiro();

  const supabase = await createSupabaseServerClient();
  const { data: campanha } = await supabase
    .from("campanhas_public")
    .select(
      "id, slug, titulo, produto, empresa_nome, atividade_parceiro, comissao_cents, comissao_recorrente, publico_alvo, resultado_util, prazo_analise_dias, prazo_pagamento_dias, janela_atribuicao_dias, janela_estorno_dias, status, territorio_ufs",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!campanha) notFound();

  // O MESMO texto que a action vai congelar. Se estes dois divergirem, o hash
  // deixa de provar o que a pessoa leu — por isso ambos chamam a mesma função.
  const contrato = montarContrato(campanha as unknown as DadosContrato, sessao.nomeCompleto);

  return (
    <>
      <PageHeader
        titulo="Contrato de Campanha"
        descricao="Leia antes de aderir. Este texto exato será congelado e assinado eletronicamente — com data, hora, IP e um hash SHA-256 que prova que ele não foi alterado depois."
      />

      <pre className="rounded-xl border border-border bg-surface p-5 text-xs leading-relaxed whitespace-pre-wrap font-mono max-h-[32rem] overflow-y-auto">
        {contrato}
      </pre>

      <AderirForm slug={slug} podeAderir={campanha.status === "publicada"} />
    </>
  );
}
