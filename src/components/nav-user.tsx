"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type Role = "buyer" | "organizer" | "admin";

type NavUserProps = {
  fullName: string | null;
  email: string;
  isOrganizer: boolean;
  isAdmin: boolean;
};

export function NavUser({ fullName, email, isOrganizer, isAdmin }: NavUserProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>(() => {
    if (isAdmin) return "admin";
    if (isOrganizer) return "organizer";
    return "buyer";
  });
  const menuRef = useRef<HTMLDivElement>(null);

  // Build the list of available roles for this user
  const roles: Role[] = ["buyer"];
  if (isOrganizer) roles.push("organizer");
  if (isAdmin) roles.push("admin");
  const multiRole = roles.length > 1;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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

  const initials = fullName
    ? fullName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : email[0].toUpperCase();

  const displayName = fullName?.split(" ")[0] ?? email.split("@")[0];

  const ROLE_LABEL: Record<Role, string> = {
    buyer: "Comprador",
    organizer: "Organizador",
    admin: "Admin",
  };

  const ROLE_COLOR: Record<Role, string> = {
    buyer: "bg-gold text-background font-medium",
    organizer: "bg-gold text-background font-medium",
    admin: "bg-red-500 text-white font-medium",
  };

  return (
    <div className="relative flex items-center gap-2 sm:gap-3 shrink-0" ref={menuRef}>
      {/* Role toggle pill — desktop, only if user has >1 role */}
      {multiRole && (
        <div className="hidden sm:flex items-center text-xs rounded-full border border-border bg-surface-2 overflow-hidden select-none">
          {roles.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`px-3 py-1 transition-colors cursor-pointer ${role === r ? ROLE_COLOR[r] : "text-muted hover:text-foreground"}`}
              title={`Alternar para ${ROLE_LABEL[r]}`}
            >
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      )}

      {/* Avatar button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full cursor-pointer focus:outline-none group"
        aria-label="Menu da conta"
      >
        <div className={`h-8 w-8 rounded-full border flex items-center justify-center text-xs font-semibold ${
          role === "admin" ? "bg-red-500/20 border-red-400/40 text-red-300" : "bg-gold/20 border-gold/40 text-gold-soft"
        }`}>
          {initials}
        </div>
        <span className="hidden sm:block text-sm text-muted group-hover:text-foreground transition-colors max-w-[120px] truncate">
          {displayName}
        </span>
        <svg
          className={`hidden sm:block h-3.5 w-3.5 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 16 16" fill="currentColor"
        >
          <path d="M8 11L2 5h12z" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-border bg-surface shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium truncate">{fullName ?? displayName}</p>
            <p className="text-xs text-muted truncate">{email}</p>
          </div>

          {/* Mobile role toggle */}
          {multiRole && (
            <div className="px-4 py-2 border-b border-border">
              <div className="flex rounded-md border border-border overflow-hidden text-xs">
                {roles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 py-1.5 transition-colors cursor-pointer ${
                      role === r ? ROLE_COLOR[r] : "text-muted hover:text-foreground"
                    }`}
                  >
                    {ROLE_LABEL[r]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Links based on role */}
          <div className="py-1.5">
            {role === "buyer" && (
              <>
                <DropdownLink href="/dashboard" onClick={() => setOpen(false)}>Minha conta</DropdownLink>
                <DropdownLink href="/dashboard/compras" onClick={() => setOpen(false)}>Minhas compras</DropdownLink>
                <DropdownLink href="/dashboard/numeros" onClick={() => setOpen(false)}>Meus números</DropdownLink>
              </>
            )}
            {role === "organizer" && (
              <>
                <DropdownLink href="/organizador/sorteios" onClick={() => setOpen(false)}>Minhas seleções</DropdownLink>
                <DropdownLink href="/organizador/sorteios/novo" onClick={() => setOpen(false)}>Nova seleção</DropdownLink>
                <DropdownLink href="/dashboard" onClick={() => setOpen(false)}>Minha conta</DropdownLink>
              </>
            )}
            {role === "admin" && (
              <>
                <DropdownLink href="/admin" onClick={() => setOpen(false)}>
                  <span className="text-red-300">Painel admin</span>
                </DropdownLink>
                <DropdownLink href="/admin/selecoes" onClick={() => setOpen(false)}>
                  <span className="text-red-300">Seleções</span>
                </DropdownLink>
                <DropdownLink href="/admin/compras" onClick={() => setOpen(false)}>
                  <span className="text-red-300">Compras</span>
                </DropdownLink>
                <DropdownLink href="/dashboard" onClick={() => setOpen(false)}>Minha conta pessoal</DropdownLink>
              </>
            )}
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

function DropdownLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) {
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
