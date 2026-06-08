import "server-only";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";

/**
 * The signed-in admin's email for use in Server Components / Server Actions
 * — null if there's no valid session. The proxy already gates `/admin/*`
 * routes, so this is for attributing actions (audit_log metadata), not
 * authorization.
 */
export async function getAdminEmail() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(token);
}
