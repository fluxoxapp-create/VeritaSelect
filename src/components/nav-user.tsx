"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type Area = "parceiro" | "empresa" | "admin";

type NavUserProps = {
  nomeCompleto: string | null;
  email: string;
  /** Tem cadastro de parceiro — dá acesso a /app. */
  temParceiro: boolean;
  /** Tem vínculo com empresa — dá acesso a /empresa. */
  temEmpresa: boolean;
  isAdmin: boolean;
  /** Área padrão, derivada de profiles.role no servidor. */
  areaInicial: Area;
};

const AREA_LABEL: Record<Area, string> = {
  parceiro: "Parceiro",
  empresa: "Empresa",
  admin: "Admin",
};

export function NavUser({
  nomeCompleto,
  email,
  temParceiro,
  temEmpresa,
  isAdmin,
  areaInicial,
}: NavUserProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const areas: Area[] = [];
  if (temParceiro) areas.push("parceiro");
  if (temEmpresa) areas.push("empresa");
  if (isAdmin) areas.push("admin");

  const [area, setArea] = useState<Area>(() =>
    areas.includes(areaInicial) ? areaInicial : (areas[0] ?? "parceiro"),
  );
  const multiArea = areas.length > 1;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleSignOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  const iniciais = nomeCompleto
    ? nomeCompleto.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : email[0].toUpperCase();

  const primeiroNome = nomeCompleto?.split(" ")[0] ?? email.split("@")[0];

  return (
    <div className="relative flex items-center gap-2 sm:gap-3 shrink-0" ref={menuRef}>
      {multiArea && (
        <div className="hidden sm:flex items-center text-xs rounded-full border border-border bg-surface-2 overflow-hidden select-none">
          {areas.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setArea(a)}
              className={`px-3 py-1 transition-colors cursor-pointer ${
                area === a
                  ? a === "admin"
                    ? "bg-erro text-background font-medium"
                    : "bg-gold text-background font-medium"
                  : "text-muted hover:text-foreground"
              }`}
              title={`Ver os atalhos de ${AREA_LABEL[a]}`}
            >
              {AREA_LABEL[a]}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full cursor-pointer focus:outline-none group"
        aria-label="Menu da conta"
      >
        <div
          className={`h-8 w-8 rounded-full border flex items-center justify-center text-xs font-semibold ${
            area === "admin"
              ? "bg-erro/20 border-erro/40 text-erro"
              : "bg-gold/20 border-gold/40 text-gold-soft"
          }`}
        >
          {iniciais}
        </div>
        <span className="hidden sm:block text-sm text-muted group-hover:text-foreground transition-colors max-w-[120px] truncate">
          {primeiroNome}
        </span>
        <svg
          className={`hidden sm:block h-3.5 w-3.5 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path d="M8 11L2 5h12z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-surface shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium truncate">{nomeCompleto ?? primeiroNome}</p>
            <p className="text-xs text-muted truncate">{email}</p>
          </div>

          {multiArea && (
            <div className="px-4 py-2 border-b border-border sm:hidden">
              <div className="flex rounded-md border border-border overflow-hidden text-xs">
                {areas.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setArea(a)}
                    className={`flex-1 py-1.5 transition-colors cursor-pointer ${
                      area === a ? "bg-gold text-background font-medium" : "text-muted"
                    }`}
                  >
                    {AREA_LABEL[a]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="py-1.5">
            {area === "parceiro" && (
              <>
                <ItemMenu href="/app" onClick={() => setOpen(false)}>Painel do parceiro</ItemMenu>
                <ItemMenu href="/app/indicacoes" onClick={() => setOpen(false)}>Minhas indicações</ItemMenu>
                <ItemMenu href="/app/comissoes" onClick={() => setOpen(false)}>Comissões</ItemMenu>
                <ItemMenu href="/app/habilitacao" onClick={() => setOpen(false)}>Habilitação</ItemMenu>
              </>
            )}
            {area === "empresa" && (
              <>
                <ItemMenu href="/empresa" onClick={() => setOpen(false)}>Painel da empresa</ItemMenu>
                <ItemMenu href="/empresa/indicacoes" onClick={() => setOpen(false)}>Fila de aprovação</ItemMenu>
                <ItemMenu href="/empresa/campanhas" onClick={() => setOpen(false)}>Minhas campanhas</ItemMenu>
                <ItemMenu href="/empresa/fatura" onClick={() => setOpen(false)}>Fatura</ItemMenu>
              </>
            )}
            {area === "admin" && (
              <>
                <ItemMenu href="/admin" onClick={() => setOpen(false)}>
                  <span className="text-erro">Painel admin</span>
                </ItemMenu>
                <ItemMenu href="/admin/habilitacoes" onClick={() => setOpen(false)}>
                  <span className="text-erro">Habilitações</span>
                </ItemMenu>
                <ItemMenu href="/admin/disputas" onClick={() => setOpen(false)}>
                  <span className="text-erro">Disputas</span>
                </ItemMenu>
              </>
            )}
            <ItemMenu href="/conta" onClick={() => setOpen(false)}>Minha conta</ItemMenu>
          </div>

          <div className="border-t border-border py-1.5">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-sm text-muted hover:text-foreground hover:bg-surface-2 transition-colors cursor-pointer"
            >
              Sair da conta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemMenu({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-2 text-sm text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
    >
      {children}
    </Link>
  );
}
