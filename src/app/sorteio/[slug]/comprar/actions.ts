"use server";

import "server-only";
import { randomUUID } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkAuthRateLimit } from "@/lib/rate-limit";
import { createPixPayment, MercadoPagoApiError } from "@/lib/payments/mercadopago";

export type CheckoutState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; compraId: string };

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 500; // real cap is "numbers still available" — kept in sync with checkout-form MAX_PER_PURCHASE
const HOLD_MINUTES = 10;

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * Starts a checkout: creates the `compras` row (pending_payment), reserves N
 * numbers atomically via `reserve_raffle_numbers`, creates a Pix payment with
 * Mercado Pago, and persists the QR/copia-e-cola onto `pagamentos`.
 *
 * Every monetary figure is re-derived server-side from the raffle's current
 * `cota_price_cents` — the client only ever supplies a quantity. This is the
 * #1 rule for this endpoint: never trust a client-supplied total.
 */
export async function startCheckout(
  _prevState: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const slug = String(formData.get("slug") ?? "").trim();
  const quantityRaw = String(formData.get("quantity") ?? "");
  const quantity = Number.parseInt(quantityRaw, 10);

  if (!slug) {
    return { status: "error", message: "Seleção inválida." };
  }
  if (!Number.isFinite(quantity) || quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) {
    return { status: "error", message: "Escolha uma quantidade válida de acessos." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Você precisa entrar para comprar acessos." };
  }

  // --- Rate limiting: prevent spamming reserve_raffle_numbers and locking up inventory ---
  // checkAuthRateLimit derives the client IP itself (mirrors the auth-rate-limit
  // pattern) and checks both an IP bucket and an identity (user id) bucket.
  const rateLimitOk = await checkAuthRateLimit({
    action: "checkout.start",
    identity: user.id,
    ipMax: 12,
    ipWindowSeconds: 60,
    identityMax: 6,
    identityWindowSeconds: 60,
  });
  if (!rateLimitOk) {
    return {
      status: "error",
      message: "Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.",
    };
  }

  // --- Load profile (banned check + role check + payer name) and raffle (server-side truth) ---
  const [{ data: profile }, { data: raffle }] = await Promise.all([
    supabase.from("profiles").select("full_name, is_banned, role").eq("id", user.id).maybeSingle(),
    supabase
      .from("raffles")
      .select("id, slug, title, status, cota_price_cents, total_cotas")
      .eq("slug", slug)
      .maybeSingle(),
  ]);

  if (profile?.is_banned) {
    return { status: "error", message: "Sua conta está suspensa. Entre em contato com o suporte." };
  }
  if (profile?.role === "organizer" || profile?.role === "admin") {
    return { status: "error", message: "Organizadores não estão habilitados para comprar acessos." };
  }
  if (!raffle) {
    return { status: "error", message: "Seleção não encontrada." };
  }
  if (raffle.status !== "published") {
    return { status: "error", message: "Esta seleção não está disponível para compra no momento." };
  }
  if (!user.email) {
    return { status: "error", message: "Sua conta precisa de um e-mail válido para comprar." };
  }

  // Server-derived money — never trust a client-supplied total.
  const unitPriceCents = raffle.cota_price_cents;
  const totalCents = unitPriceCents * quantity;
  if (!Number.isFinite(totalCents) || totalCents <= 0) {
    return { status: "error", message: "Não foi possível calcular o valor da compra." };
  }

  const admin = createSupabaseAdminClient();

  // --- Double-submit guard: reuse an existing live reservation instead of stacking a new one ---
  // Multiple tabs, a refresh-resubmit, or a slow network retry could otherwise
  // each create a `compras` row and call reserve_raffle_numbers, burning
  // through inventory for the same buyer. If this buyer already has a
  // pending_payment compra for this raffle with an active (non-expired) hold,
  // send them back to that checkout instead of minting a new one.
  const { data: existingCompra } = await admin
    .from("compras")
    .select("id, raffle_numbers:raffle_numbers(reserved_until)")
    .eq("buyer_id", user.id)
    .eq("raffle_id", raffle.id)
    .eq("status", "pending_payment")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; raffle_numbers: { reserved_until: string | null }[] | null }>();

  if (existingCompra) {
    const holds = existingCompra.raffle_numbers ?? [];
    const hasActiveHold = holds.some((h) => h.reserved_until && new Date(h.reserved_until).getTime() > Date.now());
    if (hasActiveHold) {
      return { status: "success", compraId: existingCompra.id };
    }
  }

  // Idempotency key: stable per (buyer, raffle, this checkout attempt). We
  // generate a fresh one per row — the `compras.idempotency_key` unique
  // constraint exists to dedupe true double-submits at the DB layer; pairing
  // it with a client-side "already submitting" guard (useActionState pending)
  // covers the UX side. We don't try to reuse a key across attempts because
  // each attempt may target a different quantity/raffle state.
  const idempotencyKey = randomUUID();

  const { data: compra, error: compraError } = await admin
    .from("compras")
    .insert({
      buyer_id: user.id,
      raffle_id: raffle.id,
      quantity,
      unit_price_cents: unitPriceCents,
      total_cents: totalCents,
      status: "pending_payment",
      idempotency_key: idempotencyKey,
    })
    .select("id")
    .single();

  if (compraError || !compra) {
    return {
      status: "error",
      message: "Não foi possível iniciar sua compra agora. Tente novamente em instantes.",
    };
  }

  // --- Atomic, race-safe number reservation (DB function does the heavy lifting) ---
  const { error: reserveError } = await admin.rpc("reserve_raffle_numbers", {
    p_raffle_id: raffle.id,
    p_compra_id: compra.id,
    p_quantity: quantity,
    p_hold_minutes: HOLD_MINUTES,
  });

  if (reserveError) {
    // Not enough numbers available right now (or any other reservation
    // failure) — cancel the compra row so it doesn't linger as a phantom
    // pending_payment with zero numbers attached.
    await admin.from("compras").update({ status: "cancelled" }).eq("id", compra.id);

    if (reserveError.code === "P0001" || /insufficient_available_numbers/i.test(reserveError.message)) {
      return {
        status: "error",
        message: "Não há acessos suficientes disponíveis nessa quantidade no momento.",
      };
    }
    return {
      status: "error",
      message: "Não foi possível reservar seus acessos agora. Tente novamente em instantes.",
    };
  }

  // --- Create the Pix payment with Mercado Pago ---
  let payment;
  try {
    payment = await createPixPayment({
      idempotencyKey,
      amountCents: totalCents,
      description: `VeritaSelect — ${quantity}x acesso(s) — ${raffle.title}`,
      payerEmail: user.email,
      payerFirstName: profile?.full_name?.split(" ")[0],
      externalReference: compra.id,
      notificationUrl: `${siteUrl()}/api/webhooks/mercadopago`,
    });
  } catch (err) {
    // Payment creation failed — release the reservation immediately so the
    // numbers go back into the pool rather than sitting on a 10-minute hold
    // for a purchase that has no way to be paid.
    await admin
      .from("raffle_numbers")
      .update({ purchase_id: null, reserved_until: null })
      .eq("purchase_id", compra.id);
    await admin.from("compras").update({ status: "cancelled" }).eq("id", compra.id);

    const message =
      err instanceof MercadoPagoApiError
        ? "Não foi possível gerar o Pix agora. Tente novamente em instantes."
        : "Erro ao conectar com o provedor de pagamento. Tente novamente em instantes.";
    return { status: "error", message };
  }

  // We persist only the copia-e-cola string (`pix_qr_code` — the canonical
  // textual Pix payload). The QR *image* (`qr_code_base64`) is intentionally
  // NOT stored: it's a large blob, fully derivable from the same payment id,
  // and the status page re-fetches it fresh from Mercado Pago on each load
  // (see [compraId]/page.tsx) — which also doubles as a live status check.
  const qrCode = payment.point_of_interaction?.transaction_data?.qr_code ?? null;
  const expiration = payment.date_of_expiration;

  const { error: pagamentoError } = await admin.from("pagamentos").insert({
    compra_id: compra.id,
    gateway: "mercadopago",
    gateway_payment_id: String(payment.id),
    method: "pix",
    amount_cents: totalCents,
    status: "created",
    pix_qr_code: qrCode,
    pix_expiration: expiration,
    raw_webhook_payload: null,
  });

  if (pagamentoError) {
    // We already created the payment upstream — do NOT cancel the compra
    // (money may already be in flight). Park it for manual reconciliation;
    // the webhook will still arrive and confirm_purchase_payment requires a
    // `pagamentos` row to match against, so log loudly here.
    await admin.from("audit_log").insert({
      actor_id: user.id,
      actor_role: "buyer",
      action: "purchase.payment_record_failed",
      target_table: "compras",
      target_id: compra.id,
      metadata: {
        gateway_payment_id: String(payment.id),
        note: "Pix payment created upstream but local pagamentos insert failed — needs manual reconciliation.",
      },
    });
    return {
      status: "error",
      message:
        "Seu Pix foi gerado, mas houve um problema ao registrar o pagamento. Entre em contato com o suporte informando o horário desta tentativa.",
    };
  }

  return { status: "success", compraId: compra.id };
}
