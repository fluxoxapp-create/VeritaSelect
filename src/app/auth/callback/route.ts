import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Server-side landing point for every Supabase Auth email link: password
 * recovery, email-change confirmation (both old- and new-address links), and
 * signup confirmation if/when that's enabled.
 *
 * This is the piece that makes those flows VERIFIED rather than
 * client-trusted: Supabase emails a `token_hash` + `type` (or a PKCE `code`)
 * that only the real recipient can have clicked. We exchange it here, on the
 * server, for a short-lived authenticated session tied to that action —
 * the destination page then acts on `auth.getUser()`, never on a client-
 * supplied "I am this user" claim.
 *
 * - type=recovery  → redirect to /redefinir-senha with a verified session
 *   that ONLY allows `auth.updateUser({ password })`, nothing else.
 * - type=email_change → Supabase has already applied the change server-side
 *   once both confirmations land; we just land the user back on their
 *   account page with a status message.
 * - anything invalid/expired → bounce to a neutral error state with no
 *   detail that could help an attacker distinguish "expired" from "forged".
 */
/**
 * Only same-origin relative paths may be used as a post-auth destination —
 * `new URL(value, origin)` returns an ABSOLUTE url when `value` is itself
 * absolute or protocol-relative (e.g. "https://evil.example" or
 * "//evil.example"), which would let `?next=` turn this trusted, just-
 * authenticated redirect into an open-redirect phishing primitive.
 */
function safeNext(raw: string | null, fallback: string) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return fallback;
  }
  return raw;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNext(searchParams.get("next"), "/dashboard");

  const supabase = await createSupabaseServerClient();

  let verified = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "recovery" | "email_change" | "email" | "signup" | "invite" | "magiclink",
      token_hash: tokenHash,
    });
    verified = !error;
  }

  if (!verified) {
    return NextResponse.redirect(new URL("/entrar?erro=link_invalido", origin));
  }

  if (type === "recovery") {
    return NextResponse.redirect(new URL("/redefinir-senha", origin));
  }

  if (type === "email_change") {
    return NextResponse.redirect(new URL("/dashboard/conta?email_alterado=1", origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
