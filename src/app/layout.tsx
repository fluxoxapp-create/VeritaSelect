import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { getSessao } from "@/lib/auth/session";
import { NavUser } from "@/components/nav-user";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.veritaselect.com.br"),
  title: {
    default: "Verita Select · DealBridge",
    template: "%s · Verita Select",
  },
  description:
    "Empresas publicam campanhas com a comissão que pagam. Parceiros comerciais autônomos escolhem onde atuar, indicam clientes e recebem a comissão integral — sem vínculo e sem exclusividade.",
};

const NAV_LINKS = [
  { href: "/campanhas", label: "Campanhas" },
  { href: "/para-empresas", label: "Para empresas" },
  { href: "/para-parceiros", label: "Para parceiros" },
  { href: "/como-funciona", label: "Como funciona" },
];

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const sessao = await getSessao();

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-border/80 bg-background/95 backdrop-blur sticky top-0 z-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
            <Link href="/" className="shrink-0 leading-none">
              <span className="block text-base sm:text-lg font-semibold tracking-wide whitespace-nowrap">
                VERITA<span className="text-gradient-gold">SELECT</span>
              </span>
              <span className="hidden sm:block text-[10px] uppercase tracking-[0.2em] text-muted mt-0.5">
                DealBridge
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-sm text-muted">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {sessao ? (
              <NavUser
                nomeCompleto={sessao.nomeCompleto}
                email={sessao.email}
                temParceiro={!!sessao.parceiro}
                temEmpresa={!!sessao.empresa}
                isAdmin={sessao.papel === "admin"}
                areaInicial={sessao.papel === "admin" ? "admin" : sessao.papel}
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
              <p className="text-base font-semibold tracking-wide">
                VERITA<span className="text-gradient-gold">SELECT</span>
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted mt-1 mb-3">
                DealBridge
              </p>
              <p className="text-muted max-w-xs">
                Marketplace de oportunidades de venda B2B. A comissão vai integral para quem
                vende — a plataforma cobra apenas da empresa.
              </p>
            </div>
            <div>
              <p className="font-medium mb-3">Plataforma</p>
              <ul className="space-y-2 text-muted">
                <li><Link href="/campanhas" className="hover:text-foreground">Campanhas</Link></li>
                <li><Link href="/para-empresas" className="hover:text-foreground">Para empresas</Link></li>
                <li><Link href="/para-parceiros" className="hover:text-foreground">Para parceiros</Link></li>
                <li><Link href="/como-funciona" className="hover:text-foreground">Como funciona</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-3">Confiança</p>
              <ul className="space-y-2 text-muted">
                <li><Link href="/seguranca" className="hover:text-foreground">Segurança</Link></li>
                <li><Link href="/termos/habilitacao" className="hover:text-foreground">Segmentos regulados</Link></li>
                <li><Link href="/termos/comissionamento" className="hover:text-foreground">Comissões e prazos</Link></li>
                <li><Link href="/denuncia" className="hover:text-foreground">Canal de denúncia</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-3">Legal</p>
              <ul className="space-y-2 text-muted">
                <li><Link href="/termos" className="hover:text-foreground">Termos de uso</Link></li>
                <li><Link href="/termos/privacidade" className="hover:text-foreground">Privacidade</Link></li>
                <li><Link href="/termos/comissionamento" className="hover:text-foreground">Comissionamento e disputas</Link></li>
                <li><Link href="/termos/habilitacao" className="hover:text-foreground">Habilitação profissional</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-3">Conta</p>
              <ul className="space-y-2 text-muted">
                {sessao ? (
                  <>
                    {sessao.parceiro && <li><Link href="/app" className="hover:text-foreground">Área do parceiro</Link></li>}
                    {sessao.empresa && <li><Link href="/empresa" className="hover:text-foreground">Área da empresa</Link></li>}
                    <li><Link href="/conta" className="hover:text-foreground">Minha conta</Link></li>
                  </>
                ) : (
                  <>
                    <li><Link href="/entrar" className="hover:text-foreground">Entrar</Link></li>
                    <li><Link href="/cadastro" className="hover:text-foreground">Criar conta</Link></li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className="border-t border-border/80 py-6 px-4 text-center text-xs text-muted space-y-2">
            <p>
              A Verita Select não é parte da relação comercial entre empresa e parceiro. Ela
              licencia o software, registra os fatos e cobra por isso.
            </p>
            <p>© {new Date().getFullYear()} Verita Select · DealBridge</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
