"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useRef } from "react";

const STATUS_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "paid", label: "Pagas" },
  { value: "pending_payment", label: "Aguardando" },
  { value: "refunded", label: "Estornadas" },
  { value: "cancelled", label: "Canceladas" },
] as const;

export function SearchFilter({ currentQ, currentStatus }: { currentQ: string; currentStatus: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v && v !== "all") params.set(k, v);
        else params.delete(k);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="space-y-3">
      <input
        type="search"
        placeholder="Buscar por nome, ID da compra ou número da cota…"
        defaultValue={currentQ}
        onChange={(e) => {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => updateParams({ q: e.target.value }), 400);
        }}
        className="w-full max-w-lg rounded-md border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-gold/60 placeholder:text-muted"
      />
      <div className="flex gap-2 flex-wrap text-sm">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => updateParams({ status: opt.value })}
            className={`px-3 py-1.5 rounded-md border transition-colors cursor-pointer ${
              currentStatus === opt.value || (opt.value === "all" && !currentStatus)
                ? "border-gold/60 bg-gold/10 text-gold-soft"
                : "border-border text-muted hover:border-gold/40 hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
