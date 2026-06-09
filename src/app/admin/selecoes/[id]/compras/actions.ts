"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { refundPayment, MercadoPagoApiError } from "@/lib/payments/mercadopago";

type RefundState = { error: string | null; success?: boolean } | undefined;
type BulkState = { error: string | null; success?: boolean; count?: number } | undefined;

export async function issueCompraRefund(_prevState: RefundState, formData: FormData): Promise<RefundState> {
  const compraId = String(formData.get("compraId") ?? "").trim();
  const raffleId = String(formData.get("raffleId") ?? "").trim();
  if (!compraId) return { error: "Compra não identificada." };

  const admin = createSupabaseAdminClient();

  const { data: compra } = await admin
    .from("compras")
    .select("id, status, total_cents, pagamentos(id, gateway_payment_id)")
    .eq("id", compraId)
    .maybeSingle() as { data: { id: string; status: string; total_cents: number; pagamentos: { id: string; gateway_payment_id: string }[] } | null };

  if (!compra) return { error: "Compra não encontrada." };
  if (compra.status === "refunded") return { error: "Esta compra já foi estornada." };
  if (compra.status !== "paid") return { error: "Só é possível estornar compras com pagamento confirmado." };

  const pagamento = compra.pagamentos?.[0];
  if (!pagamento?.gateway_payment_id) return { error: "Dados de pagamento não encontrados." };

  try {
    await refundPayment(pagamento.gateway_payment_id);
  } catch (err) {
    return { error: err instanceof MercadoPagoApiError ? err.message : "Erro ao processar estorno no Mercado Pago." };
  }

  await Promise.all([
    admin.from("compras").update({ status: "refunded" }).eq("id", compraId),
    admin.from("pagamentos").update({ status: "refunded" }).eq("id", pagamento.id),
    admin.from("raffle_numbers").update({ purchase_id: null, reserved_until: null }).eq("purchase_id", compraId),
    admin.from("audit_log").insert({
      actor_id: null, actor_role: "admin",
      action: "purchase.refunded",
      target_table: "compras", target_id: compraId,
      metadata: { gateway_payment_id: pagamento.gateway_payment_id, total_cents: compra.total_cents },
    }),
  ]);

  revalidatePath(`/admin/selecoes/${raffleId}/compras`);
  revalidatePath(`/admin/compras/${compraId}`);
  revalidatePath("/admin/compras");
  return { error: null, success: true };
}

export async function bulkRefundRaffle(_prevState: BulkState, formData: FormData): Promise<BulkState> {
  const raffleId = String(formData.get("raffleId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!raffleId) return { error: "Seleção não identificada." };
  if (reason.length < 10) return { error: "Informe o motivo do estorno (mínimo 10 caracteres)." };

  const admin = createSupabaseAdminClient();

  const { data: compras } = await admin
    .from("compras")
    .select("id, total_cents, pagamentos(id, gateway_payment_id)")
    .eq("raffle_id", raffleId)
    .eq("status", "paid") as { data: { id: string; total_cents: number; pagamentos: { id: string; gateway_payment_id: string }[] }[] | null };

  if (!compras?.length) return { error: "Nenhuma compra paga encontrada para esta seleção." };

  let successCount = 0;
  const errors: string[] = [];

  for (const compra of compras) {
    const pagamento = compra.pagamentos?.[0];
    if (!pagamento?.gateway_payment_id) {
      errors.push(`#${compra.id.slice(0, 8)}: sem dados de pagamento`);
      continue;
    }
    try {
      await refundPayment(pagamento.gateway_payment_id);
      await Promise.all([
        admin.from("compras").update({ status: "refunded" }).eq("id", compra.id),
        admin.from("pagamentos").update({ status: "refunded" }).eq("id", pagamento.id),
        admin.from("raffle_numbers").update({ purchase_id: null, reserved_until: null }).eq("purchase_id", compra.id),
        admin.from("audit_log").insert({
          actor_id: null, actor_role: "admin",
          action: "purchase.bulk_refunded",
          target_table: "compras", target_id: compra.id,
          metadata: { gateway_payment_id: pagamento.gateway_payment_id, total_cents: compra.total_cents, raffle_id: raffleId, reason },
        }),
      ]);
      successCount++;
    } catch (err) {
      errors.push(`#${compra.id.slice(0, 8)}: ${err instanceof MercadoPagoApiError ? err.message : "Erro no gateway"}`);
    }
  }

  revalidatePath(`/admin/selecoes/${raffleId}/compras`);
  revalidatePath("/admin/compras");

  if (successCount === 0) return { error: `Nenhum estorno processado. ${errors.join("; ")}` };
  return {
    error: errors.length ? `${successCount} estornos realizados. Falhas: ${errors.join("; ")}` : null,
    success: true,
    count: successCount,
  };
}
