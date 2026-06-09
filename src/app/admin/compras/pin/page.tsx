import { PinForm } from "./pin-form";

export default async function ComprasPinPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "/admin/compras" } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-4 text-2xl">
            🔐
          </div>
          <h1 className="text-xl font-semibold">Acesso a compras</h1>
          <p className="text-sm text-muted mt-1">
            Insira o PIN de 4 dígitos para acessar a área financeira.
          </p>
        </div>
        <PinForm next={next} />
      </div>
    </div>
  );
}
