import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";
import { ADMIN_COMPRAS_COOKIE, verifyComprasToken } from "@/lib/admin-compras-auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({ request });

  // Refresh the Supabase session on every request — Server Components can
  // only read cookies, so the middleware is the only place an expiring access
  // token can be silently rotated before it reaches a page.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );
  await supabase.auth.getUser();

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/entrar") return response;

    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!(await verifyAdminSessionToken(token))) {
      return NextResponse.redirect(new URL("/admin/entrar", request.url));
    }

    // Extra PIN layer for /admin/compras (financial operations)
    if (pathname.startsWith("/admin/compras") && pathname !== "/admin/compras/pin") {
      const pinToken = request.cookies.get(ADMIN_COMPRAS_COOKIE)?.value;
      if (!(await verifyComprasToken(pinToken))) {
        const dest = new URL("/admin/compras/pin", request.url);
        dest.searchParams.set("next", pathname);
        return NextResponse.redirect(dest);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
