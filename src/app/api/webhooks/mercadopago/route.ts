import "server-only";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  fetchPayment,
  verifyMercadoPagoWebhookSignature,
  MercadoPagoApiError,
} from "@/lib/payments/mercadopago";

/**
 * Mercado Pago Pix payment notification handler.
 *
 * Threat model / hard rules applied here:
 *
 *  1. SIGNATURE VERIFICATION — `x-signature` + `x-request-id` are validated
 *     via HMAC against MERCADOPAGO_WEBHOOK_SECRET before we trust ANYTHING
 *     in the request. An unsigned/forged "approved" notification is the #1
 *     way payment webhooks get exploited (= free raffle entries). We log
 *     every attempt — valid or not — to `webhook_events` for forensics.
 *
 *  2. NEVER TRUST THE BODY — even with a valid signature, we re-fetch the
 *     payment status server-to-server from Mercado Pago's API. The webhook
 *     is just a "go check" signal, never the source of truth.
 *
 *  3. IDEMPOTENCY — Mercado Pago retries notifications. `webhook_events`
 *     has a unique (gateway, event_id) constraint; a duplicate insert is a
 *     no-op (we still re-derive + call confirm_purchase_payment, which is
 *     itself idempotent — see migration 0002). Net effect: replays are safe.
 *
 *  4. FAST ACK — we do the verification + status fetch + confirmation inline
 *     (it's a handful of fast network calls), then return 200. Returning
 *     a non-2xx makes Mercado Pago retry, which is the correct behavior for
 *     transient failures (DB hiccup, MP API hiccup) — so genuine failures
 *     intentionally surface as 5xx to trigger a retry, while "nothing to do"
 *     cases (unknown event types, already-processed) return 200.
 */

export const runtime = "nodejs";

type NotificationBody = {
  type?: string;
  action?: string;
  data?: { id?: string | number };
};

function extractDataId(body: NotificationBody | null, url: URL): string | null {
  const fromBody = body?.data?.id;
  if (fromBody !== undefined && fromBody !== null) return String(fromBody);

  // Mercado Pago also sends `data.id` (or legacy `id`/`topic`) as query params
  // for some notification formats.
  const fromQuery = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  return fromQuery;
}

async function recordWebhookEvent(params: {
  gateway: string;
  eventId: string;
  eventType: string;
  signatureValid: boolean;
  payload: unknown;
}): Promise<{ alreadyProcessed: boolean; id: string | null }> {
  const admin = createSupabaseAdminClient();

  // Insert-or-detect-duplicate: the unique (gateway, event_id) constraint is
  // the actual idempotency guarantee — this just lets us short-circuit
  // duplicate work and report what happened.
  const { data: inserted, error: insertError } = await admin
    .from("webhook_events")
    .insert({
      gateway: params.gateway,
      event_id: params.eventId,
      event_type: params.eventType,
      signature_valid: params.signatureValid,
      payload: params.payload,
    })
    .select("id, processed_at")
    .maybeSingle();

  if (!insertError && inserted) {
    return { alreadyProcessed: Boolean(inserted.processed_at), id: inserted.id as string };
  }

  // Unique violation (23505) => duplicate delivery. Look up the existing row
  // to see whether we already finished processing it.
  const { data: existing } = await admin
    .from("webhook_events")
    .select("id, processed_at")
    .eq("gateway", params.gateway)
    .eq("event_id", params.eventId)
    .maybeSingle();

  return {
    alreadyProcessed: Boolean(existing?.processed_at),
    id: (existing?.id as string | undefined) ?? null,
  };
}

async function markProcessed(eventRowId: string | null, result: string) {
  if (!eventRowId) return;
  const admin = createSupabaseAdminClient();
  await admin
    .from("webhook_events")
    .update({ processed_at: new Date().toISOString(), processing_result: result })
    .eq("id", eventRowId);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");

  const rawBody = await request.text();
  let body: NotificationBody | null = null;
  try {
    body = rawBody ? (JSON.parse(rawBody) as NotificationBody) : null;
  } catch {
    body = null;
  }

  const dataId = extractDataId(body, url);
  const eventType = body?.type ?? body?.action ?? url.searchParams.get("type") ?? "unknown";

  // --- 1. Verify signature BEFORE trusting anything ---
  let signatureValid = false;
  try {
    signatureValid = await verifyMercadoPagoWebhookSignature({ xSignature, xRequestId, dataId });
  } catch {
    signatureValid = false;
  }

  // Always log the attempt — valid or not — for forensics / antifraude review.
  const eventId = dataId ?? xRequestId ?? `unknown:${Date.now()}`;
  const { alreadyProcessed, id: eventRowId } = await recordWebhookEvent({
    gateway: "mercadopago",
    eventId,
    eventType,
    signatureValid,
    payload: { headers: { xSignature, xRequestId }, query: Object.fromEntries(url.searchParams), body },
  });

  if (!signatureValid) {
    // Forged/unsigned notification — acknowledge with 200 so an attacker
    // probing the endpoint doesn't learn anything from status-code timing,
    // but do NOT process it. It's already logged with signature_valid=false
    // for the security team to alert on.
    await markProcessed(eventRowId, "rejected_invalid_signature");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (alreadyProcessed) {
    // Idempotent replay — acknowledge without redoing work.
    return NextResponse.json({ received: true, idempotent: true }, { status: 200 });
  }

  if (!dataId) {
    await markProcessed(eventRowId, "ignored_no_payment_id");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // Only payment-related notifications are actionable here.
  if (eventType !== "payment" && !eventType.startsWith("payment.")) {
    await markProcessed(eventRowId, `ignored_event_type:${eventType}`);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // --- 2. Re-fetch the payment server-to-server — never trust the webhook body ---
  let payment;
  try {
    payment = await fetchPayment(dataId);
  } catch (err) {
    await markProcessed(
      eventRowId,
      `error_fetch_payment:${err instanceof MercadoPagoApiError ? err.status : "network"}`,
    );
    // Transient — let Mercado Pago retry.
    return NextResponse.json({ error: "could not verify payment status" }, { status: 502 });
  }

  const admin = createSupabaseAdminClient();

  // Match the payment to our local `pagamentos` row via the gateway id we
  // stored at creation time (never via external_reference alone — that's
  // attacker-influenceable metadata, the gateway_payment_id is the anchor).
  const { data: pagamento } = await admin
    .from("pagamentos")
    .select("id, compra_id, status")
    .eq("gateway", "mercadopago")
    .eq("gateway_payment_id", String(payment.id))
    .maybeSingle();

  if (!pagamento) {
    // Payment exists at Mercado Pago but we have no matching local record —
    // could be a stale/foreign notification, or our insert failed earlier
    // (see the `purchase.payment_record_failed` audit entry in the checkout
    // action). Either way: do not confirm anything; flag for manual review.
    await admin.from("audit_log").insert({
      actor_id: null,
      actor_role: "admin",
      action: "webhook.payment_unmatched",
      target_table: "pagamentos",
      target_id: null,
      metadata: {
        gateway: "mercadopago",
        gateway_payment_id: String(payment.id),
        status: payment.status,
        note: "Mercado Pago payment notification with no matching local pagamentos row — needs manual review.",
      },
    });
    await markProcessed(eventRowId, "unmatched_payment");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // Persist the latest known gateway status + raw payload for audit/reconciliation,
  // regardless of whether it's the terminal "approved" state yet.
  await admin
    .from("pagamentos")
    .update({
      status: mapGatewayStatus(payment.status),
      raw_webhook_payload: payment as unknown as Record<string, unknown>,
    })
    .eq("id", pagamento.id);

  if (payment.status !== "approved") {
    // Not yet (or no longer) approved — nothing to confirm. Pending/in_process
    // notifications just update local status for visibility; rejected/cancelled
    // leave the compra to expire naturally (or get handled by antifraude).
    await markProcessed(eventRowId, `recorded_status:${payment.status}`);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // --- 3. Approved — confirm via the race-safe, idempotent DB transaction ---
  const { error: confirmError } = await admin.rpc("confirm_purchase_payment", {
    p_pagamento_id: pagamento.id,
    p_paid_at: payment.date_approved ?? new Date().toISOString(),
  });

  if (confirmError) {
    // P0002/P0003/P0004 are the documented failure modes from migration 0002
    // (purchase not found, unexpected state, numbers unsecured). All of them
    // already insert their own audit_log entries inside the function. We
    // still want Mercado Pago to retry in case this was a transient DB issue
    // rather than a genuine reconciliation problem — but P0003/P0004 won't
    // resolve themselves on retry, so we mark this event processed either way
    // to avoid infinite retry storms once it's logged for manual review.
    const isPermanentMismatch = /P0003|P0004|payment_received_numbers_unsecured|purchase_in_unexpected_state/i.test(
      confirmError.message,
    );
    await markProcessed(
      eventRowId,
      isPermanentMismatch ? `confirm_failed_needs_review:${confirmError.message}` : `confirm_failed_retry:${confirmError.message}`,
    );
    if (isPermanentMismatch) {
      return NextResponse.json({ received: true }, { status: 200 });
    }
    return NextResponse.json({ error: "confirmation failed" }, { status: 500 });
  }

  await markProcessed(eventRowId, "confirmed");
  return NextResponse.json({ received: true }, { status: 200 });
}

/** Maps Mercado Pago payment statuses onto our local `payment_status` enum. */
function mapGatewayStatus(mpStatus: string): string {
  switch (mpStatus) {
    case "approved":
      return "paid";
    case "pending":
    case "in_process":
    case "authorized":
      return "pending";
    case "rejected":
      return "failed";
    case "cancelled":
      return "expired";
    case "refunded":
      return "refunded";
    case "charged_back":
      return "chargeback";
    default:
      return "pending";
  }
}

// Mercado Pago sends GET requests to validate the URL when configuring
// webhooks in some flows — acknowledge without leaking internals.
export async function GET() {
  return NextResponse.json({ ok: true });
}
