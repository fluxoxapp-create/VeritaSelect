import "server-only";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "./resend";

const LOTTERY_DIGITS: Record<number, number> = { 100: 2, 1000: 3, 10000: 4, 100000: 5 };

function purchaseReceiptHtml(params: {
  buyerName: string;
  raffleTitle: string;
  raffleSlug: string;
  quantity: number;
  totalCents: number;
  numbers: number[];
  totalCotas: number;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://veritaselect.com.br";
  const digits = LOTTERY_DIGITS[params.totalCotas] ?? 5;
  const formattedNumbers = params.numbers.map((n) => String(n).padStart(digits, "0"));
  const total = (params.totalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const numbersHtml = formattedNumbers.length
    ? `<p style="font-family: 'Courier New', monospace; font-size: 16px; letter-spacing: 1px; color: #c9a84c; font-weight: 600; margin: 0;">${formattedNumbers.join(" · ")}</p>`
    : `<p style="color:#888; font-size: 13px; margin: 0;">Seus números aparecerão no painel em instantes.</p>`;

  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background:#0c0c0c; padding: 32px 16px; color:#e8e8e8;">
    <div style="max-width: 480px; margin: 0 auto; background:#161616; border:1px solid #2a2a2a; border-radius:12px; padding: 32px;">
      <p style="font-size: 13px; color:#c9a84c; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 8px;">VeritaSelect</p>
      <h1 style="font-size: 20px; margin: 0 0 16px; color:#fff;">Pagamento confirmado</h1>
      <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
        Olá, ${params.buyerName}. Recebemos a confirmação do seu pagamento via Pix para a seleção:
      </p>
      <p style="font-size: 16px; font-weight: 600; margin: 0 0 4px; color:#fff;">${params.raffleTitle}</p>
      <p style="font-size: 14px; color:#999; margin: 0 0 20px;">
        ${params.quantity} acesso${params.quantity > 1 ? "s" : ""} · ${total}
      </p>
      <div style="border-top: 1px solid #2a2a2a; padding-top: 16px; margin-bottom: 24px;">
        <p style="font-size: 11px; color:#999; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 1px;">Seus números</p>
        ${numbersHtml}
      </div>
      <a href="${siteUrl}/dashboard/numeros" style="display:inline-block; background:#c9a84c; color:#0c0c0c; text-decoration:none; font-weight:600; font-size: 14px; padding: 12px 24px; border-radius: 8px;">
        Ver meus números
      </a>
      <p style="font-size: 12px; color:#666; margin-top: 32px; line-height: 1.6;">
        A apuração desta seleção segue o resultado da Loteria Federal. Acompanhe tudo a qualquer momento em
        <a href="${siteUrl}/sorteio/${params.raffleSlug}" style="color:#c9a84c;">veritaselect.com.br</a>.
      </p>
    </div>
  </div>`;
}

/**
 * Sends the purchase-confirmation receipt for a paid `compra`. Best-effort:
 * any missing data (no email on file, raffle deleted, etc.) just skips the
 * send — this must never be the reason a webhook confirmation fails.
 */
export async function sendPurchaseReceiptForCompra(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  compraId: string,
): Promise<void> {
  const { data: compra } = await admin
    .from("compras")
    .select("id, buyer_id, raffle_id, quantity, total_cents")
    .eq("id", compraId)
    .maybeSingle();
  if (!compra) return;

  const { data: raffle } = await admin
    .from("raffles")
    .select("title, slug, total_cotas")
    .eq("id", compra.raffle_id)
    .maybeSingle();
  if (!raffle) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", compra.buyer_id)
    .maybeSingle();

  const { data: emailRows } = (await admin.rpc("get_buyer_emails", {
    buyer_ids: [compra.buyer_id],
  })) as { data: { id: string; email: string }[] | null };
  const email = emailRows?.[0]?.email;
  if (!email) return;

  const { data: numberRows } = await admin
    .from("raffle_numbers")
    .select("number")
    .eq("purchase_id", compra.id)
    .order("number", { ascending: true });

  const buyerName = (profile?.full_name as string | null)?.trim().split(" ")[0] || "comprador";

  await sendEmail({
    to: email,
    subject: `Pagamento confirmado — ${raffle.title as string}`,
    html: purchaseReceiptHtml({
      buyerName,
      raffleTitle: raffle.title as string,
      raffleSlug: raffle.slug as string,
      quantity: compra.quantity as number,
      totalCents: compra.total_cents as number,
      totalCotas: raffle.total_cotas as number,
      numbers: (numberRows ?? []).map((r) => r.number as number),
    }),
  });
}
