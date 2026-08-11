import { AreaShell } from "@/components/area-shell";
import { requireEmpresa } from "@/lib/auth/session";
import { resumoPorStatus } from "@/lib/data/indicacoes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AvisoFase0 } from "@/components/ui";

export default async function EmpresaLayout({ children }: { children: React.ReactNode }) {
  const sessao = await requireEmpresa();
  const supabase = await createSupabaseServerClient();

  // Contestações sem resposta são a fila mais cara de ignorar: passado o prazo,
  // o silêncio implica procedência (política 06 §7). O badge existe para que o
  // vencimento nunca seja por desconhecimento. A policy "partes leem a disputa"
  // limita a contagem ao próprio tenant.
  const [resumo, contestacoes] = await Promise.all([
    resumoPorStatus("empresa"),
    supabase
      .from("disputas")
      .select("id", { count: "exact", head: true })
      .is("respondida_em", null)
      .is("decidida_em", null),
  ]);

  const naFila = resumo.registrada + resumo.em_analise;
  const contestacoesAResponder = contestacoes.count ?? 0;

  const kybPendente = sessao.empresa.kybStatus !== "aprovada";

  return (
    <AreaShell
      titulo="Área da empresa"
      subtitulo={sessao.empresa.nomeFantasia}
      itens={[
        { href: "/empresa", label: "Painel" },
        { href: "/empresa/indicacoes", label: "Fila de aprovação", badge: naFila },
        { href: "/empresa/disputas", label: "Contestações", badge: contestacoesAResponder },
        { href: "/empresa/campanhas", label: "Campanhas" },
        { href: "/empresa/parceiros", label: "Parceiros" },
        { href: "/empresa/fatura", label: "Fatura" },
      ]}
      aviso={
        sessao.empresa.seloPendenciaPagamento ? (
          <AvisoFase0>
            Sua empresa está com <strong>pendência de pagamento de comissões</strong>. O selo é
            público e aparece em todas as suas campanhas. Regularize para removê-lo — a escala
            seguinte pausa novas adesões e depois suspende a conta.
          </AvisoFase0>
        ) : kybPendente ? (
          <AvisoFase0>
            {sessao.empresa.kybStatus === "reprovada"
              ? "A verificação da empresa foi reprovada. Corrija os dados e reenvie para poder publicar campanhas."
              : sessao.empresa.kybStatus === "pendente"
                ? "Verificação em andamento. Você já pode montar campanhas em rascunho; a publicação libera quando a verificação for aprovada."
                : "Sua empresa ainda não passou pela verificação. Campanhas ficam em rascunho até a aprovação."}
          </AvisoFase0>
        ) : undefined
      }
    >
      {children}
    </AreaShell>
  );
}
