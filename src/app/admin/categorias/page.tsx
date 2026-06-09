import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { addCategory, toggleCategory, moveCategoryUp, moveCategoryDown } from "./actions";

export default async function AdminCategoriasPage() {
  const supabase = createSupabaseAdminClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, icon, keywords, display_order, is_active")
    .order("display_order", { ascending: true });

  const rows = categories ?? [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Categorias</h1>
          <p className="text-muted text-sm mt-1">
            Gerencie as categorias exibidas no site. A ordem aqui é a ordem de exibição.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-muted hover:text-foreground transition-colors">
          ← Painel
        </Link>
      </div>

      {/* List */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden mb-8">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">Nenhuma categoria cadastrada.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-medium px-5 py-3">Categoria</th>
                <th className="text-left font-medium px-5 py-3 hidden sm:table-cell">Keywords (imagem)</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
                <th className="text-left font-medium px-5 py-3">Ordem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((cat, i) => (
                <tr key={cat.id} className="border-t border-border align-middle">
                  <td className="px-5 py-3 font-medium">
                    <span className="mr-2">{cat.icon}</span>
                    {cat.name}
                  </td>
                  <td className="px-5 py-3 text-muted hidden sm:table-cell text-xs font-mono">
                    {cat.keywords || "—"}
                  </td>
                  <td className="px-5 py-3">
                    <form action={toggleCategory.bind(null, cat.id, cat.is_active)}>
                      <button
                        type="submit"
                        className={`text-xs px-3 py-1 rounded-full border cursor-pointer transition-colors ${
                          cat.is_active
                            ? "border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10"
                            : "border-border text-muted hover:border-gold/40"
                        }`}
                      >
                        {cat.is_active ? "Ativa" : "Inativa"}
                      </button>
                    </form>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <form action={moveCategoryUp.bind(null, cat.id)}>
                        <button
                          type="submit"
                          disabled={i === 0}
                          className="h-7 w-7 rounded border border-border text-muted hover:border-gold/40 hover:text-foreground transition-colors disabled:opacity-30 cursor-pointer flex items-center justify-center"
                          title="Mover para cima"
                        >
                          ↑
                        </button>
                      </form>
                      <form action={moveCategoryDown.bind(null, cat.id)}>
                        <button
                          type="submit"
                          disabled={i === rows.length - 1}
                          className="h-7 w-7 rounded border border-border text-muted hover:border-gold/40 hover:text-foreground transition-colors disabled:opacity-30 cursor-pointer flex items-center justify-center"
                          title="Mover para baixo"
                        >
                          ↓
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add new */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-semibold mb-5">Nova categoria</h2>
        <form action={addCategory} className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="text-sm text-muted block mb-1.5">Ícone (emoji)</label>
              <input
                type="text"
                name="icon"
                defaultValue="🏆"
                maxLength={4}
                className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-gold/60 text-center text-xl"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm text-muted block mb-1.5">Nome</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Ex.: Aviação"
                className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-gold/60"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted block mb-1.5">
              Keywords para foto de capa{" "}
              <span className="text-xs">(separadas por vírgula — usadas no loremflickr)</span>
            </label>
            <input
              type="text"
              name="keywords"
              placeholder="Ex.: airplane,aircraft,aviation"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-gold/60"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2 rounded-md bg-gold text-background text-sm font-medium hover:bg-gold-soft transition-colors cursor-pointer"
          >
            Adicionar categoria
          </button>
        </form>
      </div>
    </div>
  );
}
