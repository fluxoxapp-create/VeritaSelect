import "server-only";

/**
 * Minimal Mercado Pago Pix integration — built directly for this provider
 * (no abstraction layer; YAGNI per spec). Two server-to-server concerns live
 * here: creating a Pix payment, and verifying + re-fetching payment status
 * for webhook processing (never trust the webhook body alone).
 *
 * Docs referenced (Mercado Pago Developers):
 *  - POST /v1/payments                         (create Pix payment)
 *  - GET  /v1/payments/{id}                     (server-to-server status check)
 *  - Webhook signature: x-signature / x-request-id headers, HMAC-SHA256
 *    over "id:{data.id};request-id:{x-request-id};ts:{ts};" using the
 *    integration's webhook secret (configured in the MP application panel).
 */

const MP_API_BASE = "https://api.mercadopago.com";

function getAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "MERCADOPAGO_ACCESS_TOKEN não configurado — defina nas variáveis de ambiente antes de processar pagamentos.",
    );
  }
  return token;
}

function getWebhookSecret(): string {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "MERCADOPAGO_WEBHOOK_SECRET não configurado — defina nas variáveis de ambiente para validar notificações.",
    );
  }
  return secret;
}

export type CreatePixPaymentInput = {
  /** Idempotency key — MUST be stable across retries of the same logical purchase. */
  idempotencyKey: string;
  /** Amount in cents — converted to a decimal BRL value for the MP API. */
  amountCents: number;
  description: string;
  payerEmail: string;
  payerFirstName?: string;
  payerLastName?: string;
  payerCpf?: string;
  /** Where MP should send the payment notification webhook. */
  notificationUrl?: string;
  /** Arbitrary correlation id stored back on our side (e.g. compra id). */
  externalReference: string;
};

export type PixPaymentResult = {
  id: number;
  status: string;
  status_detail: string;
  date_of_expiration: string | null;
  date_approved?: string | null;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
};

function centsToDecimalString(cents: number): string {
  // Mercado Pago expects a decimal amount (e.g. 19.9), not integer cents.
  // String math avoids floating point artifacts like 19.900000000000002.
  const negative = cents < 0;
  const abs = Math.abs(Math.trunc(cents));
  const reais = Math.floor(abs / 100);
  const centavos = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}${reais}.${centavos}`;
}

/**
 * Creates a Pix payment via Mercado Pago's Payments API.
 *
 * Idempotency: MP supports the `X-Idempotency-Key` header — sending the same
 * key for retried requests returns the original payment instead of creating
 * a duplicate charge. We pass the compra's own idempotency_key so a
 * double-submitted server action can never create two payments.
 */
export async function createPixPayment(input: CreatePixPaymentInput): Promise<PixPaymentResult> {
  const token = getAccessToken();

  const body: Record<string, unknown> = {
    transaction_amount: Number(centsToDecimalString(input.amountCents)),
    description: input.description,
    payment_method_id: "pix",
    external_reference: input.externalReference,
    payer: {
      email: input.payerEmail,
      ...(input.payerFirstName ? { first_name: input.payerFirstName } : {}),
      ...(input.payerLastName ? { last_name: input.payerLastName } : {}),
      ...(input.payerCpf
        ? { identification: { type: "CPF", number: input.payerCpf.replace(/\D/g, "") } }
        : {}),
    },
    ...(input.notificationUrl ? { notification_url: input.notificationUrl } : {}),
  };

  const response = await fetch(`${MP_API_BASE}/v1/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  const json = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok || !json) {
    const message =
      (json && typeof json.message === "string" && json.message) ||
      `Mercado Pago retornou status ${response.status} ao criar o pagamento Pix.`;
    throw new MercadoPagoApiError(message, response.status, json);
  }

  return json as unknown as PixPaymentResult;
}

/**
 * Fetches a payment by id directly from Mercado Pago — the only source of
 * truth for status. Webhook payload fields are advisory; this call is what
 * we actually act on.
 */
export async function fetchPayment(paymentId: string | number): Promise<PixPaymentResult> {
  const token = getAccessToken();

  const response = await fetch(`${MP_API_BASE}/v1/payments/${encodeURIComponent(String(paymentId))}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    // Never cache payment status lookups.
    cache: "no-store",
  });

  const json = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok || !json) {
    const message =
      (json && typeof json.message === "string" && json.message) ||
      `Mercado Pago retornou status ${response.status} ao consultar o pagamento ${paymentId}.`;
    throw new MercadoPagoApiError(message, response.status, json);
  }

  return json as unknown as PixPaymentResult;
}

export class MercadoPagoApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "MercadoPagoApiError";
    this.status = status;
    this.payload = payload;
  }
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toHex(signature);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Parses Mercado Pago's `x-signature` header, which looks like:
 *   "ts=1700000000,v1=abcdef0123456789..."
 */
function parseSignatureHeader(header: string): { ts: string | null; v1: string | null } {
  const parts = header.split(",");
  let ts: string | null = null;
  let v1: string | null = null;
  for (const part of parts) {
    const [rawKey, ...rest] = part.split("=");
    const key = rawKey?.trim();
    const value = rest.join("=").trim();
    if (key === "ts") ts = value;
    if (key === "v1") v1 = value;
  }
  return { ts, v1 };
}

export type WebhookSignatureInput = {
  /** Raw `x-signature` header value. */
  xSignature: string | null;
  /** Raw `x-request-id` header value. */
  xRequestId: string | null;
  /**
   * The `data.id` from the notification's query string or body
   * (Mercado Pago's documented manifest uses the resource id, lowercased).
   */
  dataId: string | null;
};

/**
 * Verifies a Mercado Pago webhook notification per their documented HMAC
 * scheme: build the manifest string
 *   "id:{data.id};request-id:{x-request-id};ts:{ts};"
 * and compare an HMAC-SHA256 of it (using the webhook secret) against the
 * `v1` value from `x-signature`, in constant time.
 *
 * Returns false (never throws on malformed input) so the caller can always
 * respond and log — a forged "approved" notification must never slip through
 * because of an unhandled exception path.
 */
export async function verifyMercadoPagoWebhookSignature(input: WebhookSignatureInput): Promise<boolean> {
  if (!input.xSignature || !input.xRequestId || !input.dataId) return false;

  const { ts, v1 } = parseSignatureHeader(input.xSignature);
  if (!ts || !v1) return false;

  let secret: string;
  try {
    secret = getWebhookSecret();
  } catch {
    return false;
  }

  const manifest = `id:${input.dataId.toLowerCase()};request-id:${input.xRequestId};ts:${ts};`;
  const expected = await hmacSha256Hex(secret, manifest);

  return constantTimeEqual(expected, v1);
}
