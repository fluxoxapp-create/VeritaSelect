import { RaffleCard } from "@/components/raffle-card";
import { getPublishedRaffles } from "@/lib/data/raffles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getActiveCategories(): Promise<{ name: string; icon: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("categories")
    .select("name, icon")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  return data ?? [];
}

export default async function SorteiosPage() {
  const [raffles, categories] = await Promise.all([
    getPublishedRaffles(),
    getActiveCategories(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
      <div className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-semibold">Sorteios ativos</h1>
        <p className="text-muted mt-2">
          Todos os organizadores listados aqui passaram pela verificação VeritaSelect.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <span className="text-sm px-4 py-2 rounded-full border border-gold/60 text-gold-soft">
          Todos
        </span>
        {categories.map((cat) => (
          <span
            key={cat.name}
            className="text-sm px-4 py-2 rounded-full border border-border text-muted"
          >
            {cat.icon} {cat.name}
          </span>
        ))}
      </div>

      {raffles.length === 0 ? (
        <p className="text-sm text-muted border border-dashed border-border rounded-xl p-12 text-center">
          Nenhuma seleção publicada no momento. Nossa curadoria está avaliando
          novos organizadores — volte em breve.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {raffles.map((raffle) => (
            <RaffleCard key={raffle.slug} raffle={raffle} />
          ))}
        </div>
      )}
    </div>
  );
}
