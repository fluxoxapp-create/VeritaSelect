import "server-only";
import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Mirrors the IP extraction in auth-audit.ts — advisory only, never for authz. */
async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Consumes one attempt from a fixed-window counter stored in
 * `rate_limit_buckets` (migration 0011) via the `check_rate_limit` security
 * definer function — atomic at the DB level, so concurrent requests from the
 * same key can't race past the limit.
 *
 * Fails OPEN: if the limiter itself is unreachable, the action proceeds.
 * A broken rate limiter must never become an account-lockout vector — the
 * Supabase Auth layer underneath still has its own brute-force protections.
 */
async function consume(key: string, maxAttempts: number, windowSeconds: number): Promise<boolean> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_max_attempts: maxAttempts,
      p_window_seconds: windowSeconds,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}

/**
 * Dual-bucket check for auth endpoints with no CDN/WAF layer configured yet:
 *
 * - an IP bucket catches one attacker spraying many identities from one
 *   address (credential stuffing),
 * - an identity bucket catches one identity being hammered from many
 *   addresses (distributed brute force / proxy pools).
 *
 * Both buckets are always consumed (so the counters stay accurate for
 * forensics) but the action is allowed only when BOTH are within budget.
 */
export async function checkAuthRateLimit(opts: {
  action: string;
  identity: string;
  ipMax: number;
  ipWindowSeconds: number;
  identityMax: number;
  identityWindowSeconds: number;
}): Promise<boolean> {
  const ip = await clientIp();
  const [ipOk, identityOk] = await Promise.all([
    consume(`${opts.action}:ip:${ip}`, opts.ipMax, opts.ipWindowSeconds),
    consume(`${opts.action}:id:${opts.identity}`, opts.identityMax, opts.identityWindowSeconds),
  ]);
  return ipOk && identityOk;
}
