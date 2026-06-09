"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { refundPayment, MercadoPagoApiError } from "@/lib/payments/mercadopago";

export async function issueRefund(
  _prevState: { error: string | null; success?: boolean } | undefined,
  formData: FormData,
) {
  const compraId = String(formData.get("compraId") ?? "").trim();
  if (!compraId) return { error: "Compra não identificada." };

  const admin = createSupabaseAdminClient();

  // Load purchase + payment in one round-trip
  const { data: compra } = await admin
    .from("compras")
    .select("id, status, total_cents, raffle_id, buyer_id, pagamentos(id, gateway_payment_id, status)")
    .eq("id", compraId)
    .maybeSingle<{
      id: string;
      status: string;
      total_cents: number;
      raffle_id: string;
      buyer_id: string;
      pagamentos: { id: string; gateway_payment_id: string; status: string }[];
    }>();

  if (!compra) return { error: "Compra não encontrada." };
  if (compra.status === "refunded") return { error: "Esta compra já foi estornada." };
  if (compra.status !== "paid") return { error: "Só é possível estornar compras com pagamento confirmado." };

  const pagamento = compra.pagamentos?.[0];
  if (!pagamento?.gateway_payment_id) return { error: "Dados de pagamento não encontrados." };

  // Call Mercado Pago refund API
  try {
    await refundPayment(pagamento.gateway_payment_id);
  } catch (err) {
    const msg = err instanceof MercadoPagoApiError ? err.message : "Erro ao processar estorno no Mercado Pago.";
    return { error: msg };
  }

  // Update DB atomically: compra + pagamento + release raffle numbers + audit log
  await Promise.all([
    admin.from("compras").update({ status: "refunded" }).eq("id", compraId),
    admin.from("pagamentos").update({ status: "refunded" }).eq("id", pagamento.id),
    // Release reserved/claimed numbers back to pool
    admin.from("raffle_numbers")
      .update({ purchase_id: null, reserved_until: null })
      .eq("purchase_id", compraId),
    admin.from("audit_log").insert({
      actor_id: null,
      actor_role: "admin",
      action: "purchase.refunded",
      target_table: "compras",
      target_id: compraId,
      metadata: {
        gateway_payment_id: pagamento.gateway_payment_id,
        total_cents: compra.total_cents,
        note: "Full refund issued via admin panel.",
      },
    }),
  ]);

  revalidatePath(`/admin/compras/${compraId}`);
  revalidatePath("/admin/compras");

  return { error: null, success: true };
}
