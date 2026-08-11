import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";
import { ADMIN_FINANCEIRO_COOKIE, verifyFinanceiroToken } from "@/lib/admin-financeiro-auth";

/**
 * Em Next.js 16 o arquivo `middleware.ts` foi renomeado para `proxy.ts` e a
 * função exportada passou a ser `proxy`. Ver
 * `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
 */

/** Rotas administrativas com impacto financeiro ou de reputação — exigem PIN. */
const ROTAS_COM_PIN = ["/admin/empresas", "/admin/faturas"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({ request });

  // Renova a sessão do Supabase a cada request — Server Components só
  // conseguem LER cookies, então o proxy é o único lugar onde um access token
  // expirando pode ser rotacionado antes de chegar à página.
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

    // Segundo fator para operações de maior impacto: aprovar KYB decide quem
    // pode transacionar na plataforma, e a fatura é o nosso único fluxo
    // financeiro. Sessão de admin roubada não basta para chegar nelas.
    if (pathname !== "/admin/pin" && ROTAS_COM_PIN.some((r) => pathname.startsWith(r))) {
      const pinToken = request.cookies.get(ADMIN_FINANCEIRO_COOKIE)?.value;
      if (!(await verifyFinanceiroToken(pinToken))) {
        const destino = new URL("/admin/pin", request.url);
        destino.searchParams.set("next", pathname);
        return NextResponse.redirect(destino);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
