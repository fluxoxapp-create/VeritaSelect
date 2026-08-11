import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AvisoRascunhoJuridico } from "@/components/ui";
import {
  DOCUMENTOS,
  isSlugDocumento,
  lerDocumento,
  type SlugDocumento,
} from "@/lib/documentos-juridicos";
import { renderMarkdown } from "@/lib/markdown";

export function generateStaticParams() {
  return Object.keys(DOCUMENTOS).map((doc) => ({ doc }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ doc: string }>;
}): Promise<Metadata> {
  const { doc } = await params;
  if (!isSlugDocumento(doc)) return { title: "Documento não encontrado" };
  return { title: DOCUMENTOS[doc].titulo, description: DOCUMENTOS[doc].resumo };
}

export default async function DocumentoJuridico({
  params,
}: {
  params: Promise<{ doc: string }>;
}) {
  const { doc } = await params;
  if (!isSlugDocumento(doc)) notFound();

  const meta = DOCUMENTOS[doc as SlugDocumento];
  const fonte = await lerDocumento(doc);
  const html = renderMarkdown(fonte);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <Link href="/termos" className="text-sm text-muted hover:text-foreground">
        ← Todos os documentos
      </Link>

      {meta.rascunho && (
        <div className="mt-6">
          <AvisoRascunhoJuridico />
        </div>
      )}

      <article className="mt-8" dangerouslySetInnerHTML={{ __html: html }} />

      <p className="mt-12 pt-6 border-t border-border/60 text-xs text-muted">
        Este texto é renderizado diretamente do arquivo{" "}
        <code className="rounded bg-surface-2 px-1.5 py-0.5">juridico/{meta.arquivo}</code> do
        repositório — não há segunda cópia que possa divergir. No momento do aceite, o conteúdo é
        congelado e hasheado com data, hora e IP, porque apontar para o arquivo vivo não prova o
        que a pessoa leu.
      </p>
    </div>
  );
}
