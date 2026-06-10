import "server-only";
import { Resend } from "resend";

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? "VeritaSelect <noreply@veritaselect.com.br>";

let client: Resend | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

/**
 * Best-effort email send. Returns `{ sent: false }` instead of throwing when
 * RESEND_API_KEY isn't configured yet (e.g. domain still verifying) or the
 * provider call fails — callers use this for non-critical notifications
 * (receipts) that must never block the flow that triggers them.
 */
export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<{ sent: boolean; error?: string }> {
  const resend = getClient();
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY não configurado — email "${params.subject}" não enviado para ${params.to}`);
    return { sent: false, error: "not_configured" };
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (error) {
      console.error(`[email] Falha ao enviar "${params.subject}" para ${params.to}:`, error.message);
      return { sent: false, error: error.message };
    }
    return { sent: true };
  } catch (err) {
    console.error(`[email] Erro inesperado ao enviar "${params.subject}" para ${params.to}:`, err);
    return { sent: false, error: "exception" };
  }
}
