import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader, Card, AvisoRascunhoJuridico } from "@/components/ui";
import { DOCUMENTOS } from "@/lib/documentos-juridicos";

export const metadata: Metadata = {
  title: "Documentos",
  description:
    "Termos de uso, política de privacidade, comissionamento, disputas e habilitação profissional da Verita Select · DealBridge.",
};

export default function TermosIndex() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <PageHeader
        titulo="Documentos"
        descricao="Tudo que rege a relação entre empresa, parceiro e plataforma. São documentos longos porque as regras que valem em juízo não cabem em um resumo."
      />

      <div className="mb-8">
        <AvisoRascunhoJuridico />
      </div>

      <div className="space-y-3">
        {Object.entries(DOCUMENTOS).map(([slug, doc]) => (
          <Link
            key={slug}
            href={`/termos/${slug}`}
            className="block rounded-xl border border-border bg-surface p-5 hover:border-gold/40 transition-colors"
          >
            <p className="font-medium">{doc.titulo}</p>
            <p className="text-sm text-muted mt-1.5">{doc.resumo}</p>
          </Link>
        ))}
      </div>

      <Card className="mt-10">
        <h2 className="font-medium">Como registramos um aceite</h2>
        <p className="text-sm text-muted mt-2">
          Quando você aceita um destes documentos, a plataforma renderiza o texto, congela aquela
          versão exata, calcula um hash SHA-256 e grava tudo junto com seu IP, data, hora e a
          versão do documento. Nada aponta para uma URL viva.
        </p>
        <p className="text-sm text-muted mt-2">
          O motivo é simples: o texto publicado muda com o tempo. Se um dia houver discussão sobre
          o que foi combinado, o que vale é o que você leu naquele instante — e é isso que fica
          guardado, em tabela que não aceita alteração nem exclusão.
        </p>
      </Card>
    </div>
  );
}
