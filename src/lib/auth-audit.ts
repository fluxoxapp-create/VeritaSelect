import "server-only";
import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Best-effort client IP extraction for audit_log.actor_ip.
 *
 * Reverse proxies (Vercel, Cloudflare) set x-forwarded-for / x-real-ip; this
 * is advisory only (clients can spoof it pre-proxy) — never use it for
 * authorization decisions, only for forensic/antifraude trails.
 */
async function clientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip");
}

/**
 * Caps free-text user input before it lands in the (append-only, JSONB)
 * audit_log.metadata column. The "email" attempted on a failed sign-in or
 * recovery request is attacker-controlled — without a bound, someone could
 * pad the field to bloat storage or smuggle pathological strings into
 * whatever later renders these entries (e.g. the admin audit viewer).
 * 254 is the practical max length of a valid email address (RFC 5321).
 */
export function sanitizeAuditText(value: string, maxLength = 254): string {
  return value.slice(0, maxLength);
}

export type ProfileRole = "buyer" | "organizer" | "admin";

/**
 * Looks up the authoritative role for an authenticated user from
 * `profiles.role` — NOT `user_metadata`, which only ever reflects what the
 * client sent at signup (always defaults to 'buyer' there) and is never
 * updated on promotion to organizer/admin (see migration 0003's comment:
 * promotion happens through the audited admin panel, not client metadata).
 * Trusting `user_metadata.role` for an audit trail would silently mislabel
 * every promoted account forever.
 */
export async function getProfileRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileRole> {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  return (data?.role as ProfileRole | undefined) ?? "buyer";
}

export type AuthAuditAction =
  | "auth.sign_in"
  | "auth.sign_in_failed"
  | "auth.sign_up"
  | "auth.sign_out"
  | "auth.password_recovery_requested"
  | "auth.password_reset_completed"
  | "auth.password_changed"
  | "auth.email_change_requested"
  | "auth.email_changed";

/**
 * Appends an entry to the append-only audit_log for a buyer/organizer auth
 * event. Uses the service-role client because RLS only grants admins read
 * access and inserts are service-role-only (see migration 0001) — buyers
 * must never be able to write their own audit trail.
 *
 * Never throws: audit logging must not block or break the auth flow it is
 * observing. Failures are swallowed (and could be wired to a log sink later).
 */
export async function logAuthEvent(params: {
  actorId: string | null;
  actorRole: "buyer" | "organizer" | "admin" | null;
  action: AuthAuditAction;
  metadata?: Record<string, unknown>;
}) {
  try {
    const ip = await clientIp();
    const supabase = createSupabaseAdminClient();
    await supabase.from("audit_log").insert({
      actor_id: params.actorId,
      actor_role: params.actorRole,
      actor_ip: ip,
      action: params.action,
      target_table: "profiles",
      target_id: params.actorId,
      metadata: params.metadata ?? {},
    });
  } catch {
    // Swallow — audit logging is observability, not a gate. A failure here
    // must never prevent a user from signing in, resetting a password, etc.
  }
}
