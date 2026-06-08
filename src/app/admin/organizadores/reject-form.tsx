"use client";

import { useState } from "react";
import { rejectOrganizer } from "./actions";

export function RejectForm({ organizerId }: { organizerId: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1.5 rounded-md border border-red-400/40 text-red-300 hover:bg-red-400/10 transition-colors"
      >
        Reprovar
      </button>
    );
  }

  return (
    <form action={rejectOrganizer} className="flex items-center gap-2">
      <input type="hidden" name="organizerId" value={organizerId} />
      <input
        type="text"
        name="reason"
        required
        placeholder="Motivo da reprovação"
        className="text-xs rounded-md border border-border bg-surface px-3 py-1.5 outline-none focus:border-gold/60 w-48"
      />
      <button
        type="submit"
        className="text-xs px-3 py-1.5 rounded-md border border-red-400/40 text-red-300 hover:bg-red-400/10 transition-colors"
      >
        Confirmar
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs px-2 py-1.5 text-muted hover:text-foreground transition-colors"
      >
        Cancelar
      </button>
    </form>
  );
}
