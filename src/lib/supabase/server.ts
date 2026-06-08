import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * RLS-scoped client for use in Server Components / Server Actions / Route
 * Handlers. Runs as the signed-in user (or anon) — every query is subject to
 * Postgres row-level security. Never use this for privileged admin writes.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll called from a Server Component without a mutable cookie
            // store — safe to ignore as long as middleware refreshes sessions.
          }
        },
      },
    },
  );
}
