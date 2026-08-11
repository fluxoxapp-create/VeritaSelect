import { AreaShell } from "@/components/area-shell";
import { requireParceiro } from "@/lib/auth/session";
import { resumoPorStatus } from "@/lib/data/indicacoes";
import { AvisoFase0 } from "@/components/ui";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessao = await requireParceiro();
  const resumo = await resumoPorStatus("parceiro");

  const emDisputa = resumo.em_disputa + resumo.recusada;

  return (
    <AreaShell
      titulo="Área do parceiro"
      subtitulo={sessao.nomeCompleto}
      itens={[
        { href: "/app", label: "Painel" },
        { href: "/app/campanhas", label: "Minhas campanhas" },
        { href: "/app/indicacoes", label: "Indicações" },
        { href: "/app/comissoes", label: "Comissões" },
        { href: "/app/habilitacao", label: "Habilitação" },
        ...(emDisputa ? [{ href: "/app/indicacoes?status=recusada", label: "Contestar", badge: emDisputa }] : []),
      ]}
      aviso={
        !sessao.parceiro.temChavePix ? (
          <AvisoFase0>
            Você ainda não cadastrou a chave Pix. A empresa paga a comissão{" "}
            <strong>diretamente a você</strong> — sem essa informação ela não tem como liquidar.{" "}
            <a href="/conta" className="underline">
              Cadastrar agora
            </a>
            .
          </AvisoFase0>
        ) : undefined
      }
    >
      {children}
    </AreaShell>
  );
}
