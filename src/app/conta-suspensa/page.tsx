import type { Metadata } from "next";
import { Card, BotaoLink } from "@/components/ui";

export const metadata: Metadata = { title: "Conta suspensa" };

export default function ContaSuspensa() {
  return (
    <div className="mx-auto max-w-lg px-6 py-24">
      <Card>
        <h1 className="text-xl font-semibold">Sua conta está suspensa</h1>
        <p className="text-sm text-muted mt-3">
          O acesso às áreas de parceiro e de empresa está bloqueado. Toda sanção é precedida de
          notificação e de prazo de 5 dias para defesa — salvo fraude evidente ou ordem judicial.
        </p>
        <p className="text-sm text-muted mt-3">
          Indicações já registradas continuam existindo e mantêm o direito à comissão dentro da
          janela de atribuição. Suspensão de conta não apaga o que já foi feito.
        </p>
        <div className="mt-6">
          <BotaoLink href="/denuncia" variante="secundario" tamanho="sm">
            Apresentar defesa
          </BotaoLink>
        </div>
      </Card>
    </div>
  );
}
