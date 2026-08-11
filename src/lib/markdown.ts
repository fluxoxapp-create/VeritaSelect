import "server-only";

/**
 * Renderizador de Markdown mínimo, para os documentos de `juridico/`.
 *
 * Por que não uma biblioteca: nada entra na stack sem passar pelo
 * `certificador-stack`, e a entrada aqui é 100% controlada — arquivos do
 * próprio repositório, não conteúdo de usuário. O subconjunto suportado é
 * exatamente o que esses documentos usam: títulos, parágrafos, listas,
 * tabelas, citações, regras horizontais, negrito, itálico e código inline.
 *
 * Ainda assim todo texto passa por escape antes de virar HTML. Se um dia
 * alguém apontar isto para conteúdo enviado por usuário, o escape é o que
 * impede que a mudança vire XSS silenciosamente.
 */

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Negrito, itálico, código inline e links — aplicados sobre texto já escapado. */
function inline(texto: string): string {
  return escapar(texto)
    .replace(/`([^`]+)`/g, '<code class="rounded bg-surface-2 px-1.5 py-0.5 text-[0.85em]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-foreground font-medium">$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      '<a href="$2" class="text-gold-soft hover:text-gold underline">$1</a>',
    );
}

function linhaDeTabela(linha: string): string[] {
  return linha
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());
}

const SEPARADOR_TABELA = /^\|?[\s:-]*-[\s|:-]*\|?$/;

export function renderMarkdown(fonte: string): string {
  const linhas = fonte.split(/\r?\n/);
  const saida: string[] = [];
  let i = 0;

  const fecharLista = (tipo: "ul" | "ol") => saida.push(`</${tipo}>`);

  while (i < linhas.length) {
    const linha = linhas[i];

    // Bloco de código
    if (linha.startsWith("```")) {
      const corpo: string[] = [];
      i++;
      while (i < linhas.length && !linhas[i].startsWith("```")) {
        corpo.push(linhas[i]);
        i++;
      }
      i++;
      saida.push(
        `<pre class="rounded-lg border border-border bg-surface-2 p-4 overflow-x-auto text-xs my-5"><code>${escapar(corpo.join("\n"))}</code></pre>`,
      );
      continue;
    }

    // Tabela
    if (linha.startsWith("|") && SEPARADOR_TABELA.test(linhas[i + 1] ?? "")) {
      const cabecalho = linhaDeTabela(linha);
      i += 2;
      const corpo: string[][] = [];
      while (i < linhas.length && linhas[i].startsWith("|")) {
        corpo.push(linhaDeTabela(linhas[i]));
        i++;
      }
      saida.push(
        `<div class="overflow-x-auto my-6"><table class="w-full text-sm border-collapse">` +
          `<thead><tr>${cabecalho
            .map(
              (c) =>
                `<th class="text-left font-medium border-b border-border py-2 pr-4 align-top">${inline(c)}</th>`,
            )
            .join("")}</tr></thead>` +
          `<tbody>${corpo
            .map(
              (l) =>
                `<tr>${l
                  .map(
                    (c) =>
                      `<td class="border-b border-border/50 py-2 pr-4 align-top text-muted">${inline(c)}</td>`,
                  )
                  .join("")}</tr>`,
            )
            .join("")}</tbody></table></div>`,
      );
      continue;
    }

    // Títulos
    const titulo = /^(#{1,6})\s+(.*)$/.exec(linha);
    if (titulo) {
      const nivel = titulo[1].length;
      const classe =
        nivel === 1
          ? "text-2xl font-semibold tracking-tight mt-10 mb-4 first:mt-0"
          : nivel === 2
            ? "text-lg font-semibold mt-8 mb-3"
            : "text-base font-medium mt-6 mb-2";
      saida.push(`<h${nivel} class="${classe}">${inline(titulo[2])}</h${nivel}>`);
      i++;
      continue;
    }

    // Regra horizontal
    if (/^---+$/.test(linha.trim())) {
      saida.push('<hr class="border-border/60 my-8" />');
      i++;
      continue;
    }

    // Citação
    if (linha.startsWith(">")) {
      const corpo: string[] = [];
      while (i < linhas.length && linhas[i].startsWith(">")) {
        corpo.push(linhas[i].replace(/^>\s?/, ""));
        i++;
      }
      saida.push(
        `<blockquote class="border-l-2 border-gold/50 bg-gold/5 pl-4 py-3 my-5 text-sm text-muted">${inline(corpo.join(" "))}</blockquote>`,
      );
      continue;
    }

    // Lista ordenada
    if (/^\d+\.\s/.test(linha)) {
      saida.push('<ol class="list-decimal list-outside pl-5 space-y-1.5 my-4 text-muted">');
      while (i < linhas.length && /^\d+\.\s/.test(linhas[i])) {
        saida.push(`<li>${inline(linhas[i].replace(/^\d+\.\s/, ""))}</li>`);
        i++;
      }
      fecharLista("ol");
      continue;
    }

    // Lista não ordenada
    if (/^[-*]\s/.test(linha)) {
      saida.push('<ul class="list-disc list-outside pl-5 space-y-1.5 my-4 text-muted">');
      while (i < linhas.length && /^[-*]\s/.test(linhas[i])) {
        saida.push(`<li>${inline(linhas[i].replace(/^[-*]\s/, ""))}</li>`);
        i++;
      }
      fecharLista("ul");
      continue;
    }

    // Linha em branco
    if (!linha.trim()) {
      i++;
      continue;
    }

    // Parágrafo: junta linhas até a próxima em branco ou início de outro bloco.
    const paragrafo: string[] = [];
    while (
      i < linhas.length &&
      linhas[i].trim() &&
      !/^(#{1,6}\s|[-*]\s|\d+\.\s|>|\||```|---+$)/.test(linhas[i])
    ) {
      paragrafo.push(linhas[i]);
      i++;
    }
    if (paragrafo.length) {
      saida.push(`<p class="text-muted leading-relaxed my-4">${inline(paragrafo.join(" "))}</p>`);
    } else {
      i++;
    }
  }

  return saida.join("\n");
}
