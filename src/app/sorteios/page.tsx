import { RaffleCard } from "@/components/raffle-card";
import { getPublishedRaffles } from "@/lib/data/raffles";

const CATEGORIES = ["Todos", "Agro", "Caminhonetes", "Motos", "Náutico", "Automotivo"];

export default async function SorteiosPage() {
  const raffles = await getPublishedRaffles();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
      <div className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-semibold">Sorteios ativos</h1>
        <p className="text-muted mt-2">
          Todos os organizadores listados aqui passaram pela verificação VeritaSelect.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((category) => (
          <span
            key={category}
            className="text-sm px-4 py-2 rounded-full border border-border text-muted first:border-gold/60 first:text-gold-soft"
          >
            {category}
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
