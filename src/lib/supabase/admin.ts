import "server-only";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

/**
 * Privileged client that bypasses Row Level Security via the service-role /
 * secret key. Use ONLY for operations that must see/touch everything:
 * payment confirmation + number-claim transactions, admin panel data,
 * webhook processing, audit-log writes.
 *
 * Never import this from a Client Component or anything bundled to the
 * browser — the `server-only` import throws at build time if that happens.
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      // Node 20 has no native WebSocket; the realtime client needs one even
      // when we never call .channel(). Without this, any server-side use of
      // this client throws "Node.js 20 detected without native WebSocket support".
      realtime: {
        transport: WebSocket as unknown as typeof globalThis.WebSocket,
      },
    },
  );
}
