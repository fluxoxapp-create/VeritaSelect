import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NavUser } from "@/components/nav-user";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "VeritaSelect | Seleções Verificadas",
  description: "Seleções premium verificadas — carros, motos, barcos, agro e mais. Curadoria, organizador verificado e apuração oficial.",
};

const NAV_LINKS = [
  { href: "/sorteios", label: "Sorteios" },
  { href: "/ganhadores", label: "Ganhadores" },
  { href: "/como-funciona", label: "Como funciona" },
  { href: "/seguranca", label: "Segurança" },
];

async function getNavUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return null;

    const [{ data: profile }, { data: organizer }] = await Promise.all([
      supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle(),
      supabase.from("organizers").select("id").eq("id", user.id).eq("kyc_status", "approved").maybeSingle(),
    ]);

    return {
      email: user.email,
      fullName: profile?.full_name ?? null,
      isOrganizer: !!organizer,
      isAdmin: profile?.role === "admin",
    };
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navUser = await getNavUser();

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-border/80 bg-background/95 backdrop-blur sticky top-0 z-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
            <Link href="/" className="shrink-0 text-base sm:text-lg font-semibold tracking-wide whitespace-nowrap">
              VERITA<span className="text-gradient-gold">SELECT</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8 text-sm text-muted">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-foreground transition-colors">
                  {link.label}
                </Link>
              ))}
            </nav>

            {navUser ? (
              <NavUser
                fullName={navUser.fullName}
                email={navUser.email}
                isOrganizer={navUser.isOrganizer}
                isAdmin={navUser.isAdmin}
              />
            ) : (
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <Link
                  href="/entrar"
                  className="text-sm text-muted hover:text-foreground transition-colors whitespace-nowrap"
                >
                  Entrar
                </Link>
                <Link
                  href="/cadastro"
                  className="text-sm font-medium px-3 sm:px-4 py-2 rounded-md bg-gold text-background hover:bg-gold-soft transition-colors whitespace-nowrap"
                >
                  Criar conta
                </Link>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-border/80 mt-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 text-sm">
            <div className="md:col-span-1">
              <p className="text-base font-semibold tracking-wide mb-3">
                VERITA<span className="text-gradient-gold">SELECT</span>
              </p>
              <p className="text-muted max-w-xs">
                Plataforma premium aberta ao público, com organizadores altamente verificados.
              </p>
            </div>
            <div>
              <p className="font-medium mb-3">Plataforma</p>
              <ul className="space-y-2 text-muted">
                <li><Link href="/sorteios" className="hover:text-foreground">Sorteios</Link></li>
                <li><Link href="/ganhadores" className="hover:text-foreground">Ganhadores</Link></li>
                <li><Link href="/como-funciona" className="hover:text-foreground">Como funciona</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-3">Confiança</p>
              <ul className="space-y-2 text-muted">
                <li><Link href="/seguranca" className="hover:text-foreground">Segurança</Link></li>
                <li><Link href="/seguranca" className="hover:text-foreground">Anti-fraude</Link></li>
                <li><Link href="/seguranca" className="hover:text-foreground">Transparência</Link></li>
                <li><Link href="/organizador" className="hover:text-foreground">Para organizadores</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-3">Legal</p>
              <ul className="space-y-2 text-muted">
                <li><Link href="/termos" className="hover:text-foreground">Termos de uso</Link></li>
                <li><Link href="/termos" className="hover:text-foreground">Política de privacidade</Link></li>
                <li><Link href="/termos" className="hover:text-foreground">Regras das seleções</Link></li>
                <li><Link href="/termos" className="hover:text-foreground">Compliance</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-3">Conta</p>
              <ul className="space-y-2 text-muted">
                {navUser ? (
                  <li><Link href="/dashboard" className="hover:text-foreground">Minha conta</Link></li>
                ) : (
                  <>
                    <li><Link href="/entrar" className="hover:text-foreground">Entrar</Link></li>
                    <li><Link href="/cadastro" className="hover:text-foreground">Criar conta</Link></li>
                  </>
                )}
              </ul>
            </div>
          </div>
          <div className="border-t border-border/80 py-6 text-center text-xs text-muted">
            © {new Date().getFullYear()} VeritaSelect. Todos os direitos reservados.
          </div>
        </footer>
      </body>
    </html>
  );
}
