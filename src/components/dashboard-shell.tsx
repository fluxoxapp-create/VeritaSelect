import Link from "next/link";

const LINKS = [
  { href: "/dashboard", label: "Visão geral" },
  { href: "/dashboard/compras", label: "Minhas compras" },
  { href: "/dashboard/numeros", label: "Meus números" },
  { href: "/dashboard/conta", label: "Sua conta" },
];

export function DashboardShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12 grid lg:grid-cols-[220px_1fr] gap-10">
      <aside className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted mb-3">Minha conta</p>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block text-sm px-3 py-2 rounded-md text-muted hover:text-foreground hover:bg-surface transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </aside>
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-muted text-sm mt-1 mb-8">{description}</p>
        {children}
      </div>
    </div>
  );
}
