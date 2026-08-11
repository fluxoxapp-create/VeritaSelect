import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireEmpresa } from "@/lib/auth/session";
import { CampanhaForm } from "./campanha-form";

export const metadata: Metadata = { title: "Nova campanha" };

export default async function NovaCampanha() {
  const sessao = await requireEmpresa();

  return (
    <>
      <PageHeader
        titulo="Nova campanha"
        descricao="O que você publicar aqui vira contrato no momento da adesão do parceiro. Comissão, prazos e critério de resultado ficam congelados para cada indicação registrada."
      />
      <CampanhaForm kybAprovado={sessao.empresa.kybStatus === "aprovada"} />
    </>
  );
}
