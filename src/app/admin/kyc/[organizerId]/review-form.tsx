"use client";

import { useActionState, useState } from "react";
import { approveKyc, rejectKyc } from "./actions";

type State = { error: string | null; success?: boolean } | undefined;

export function KycReviewForm({ organizerId }: { organizerId: string }) {
  const [approveState, approveAction, approvePending] = useActionState(approveKyc, undefined as State);
  const [rejectState, rejectAction, rejectPending] = useActionState(rejectKyc, undefined as State);
  const [showReject, setShowReject] = useState(false);

  if (approveState?.success) {
    return (
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 px-5 py-4 text-center">
        <p className="text-emerald-300 font-medium">KYC aprovado. Organizador verificado.</p>
      </div>
    );
  }

  if (rejectState?.success) {
    return (
      <div className="rounded-xl border border-red-400/30 bg-red-400/5 px-5 py-4 text-center">
        <p className="text-red-400 font-medium">KYC reprovado. Motivo registrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(approveState?.error || rejectState?.error) && (
        <p className="text-sm text-red-400 border border-red-400/20 bg-red-400/5 rounded-md px-3 py-2">
          {approveState?.error ?? rejectState?.error}
        </p>
      )}

      <div className="flex gap-3">
        <form action={approveAction}>
          <input type="hidden" name="organizerId" value={organizerId} />
          <button
            type="submit"
            disabled={approvePending || rejectPending}
            onClick={(e) => {
              if (!confirm("Aprovar e verificar este organizador?")) e.preventDefault();
            }}
            className="px-5 py-2 rounded-md border border-emerald-400/40 text-emerald-300 text-sm font-medium hover:bg-emerald-400/10 transition-colors cursor-pointer disabled:opacity-60"
          >
            {approvePending ? "Aprovando…" : "Aprovar e verificar"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setShowReject((v) => !v)}
          className="px-5 py-2 rounded-md border border-red-400/40 text-red-400 text-sm font-medium hover:bg-red-400/10 transition-colors cursor-pointer"
        >
          Reprovar
        </button>
      </div>

      {showReject && (
        <form action={rejectAction} className="space-y-3">
          <input type="hidden" name="organizerId" value={organizerId} />
          <textarea
            name="reason"
            required
            rows={3}
            placeholder="Ex.: Selfie não está mostrando rosto completo. Reenvie com rosto visível e documento legível."
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-red-400/60 resize-none placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={rejectPending}
            className="px-5 py-2 rounded-md border border-red-400/40 bg-red-400/10 text-red-400 text-sm font-medium hover:bg-red-400/20 transition-colors cursor-pointer disabled:opacity-60"
          >
            {rejectPending ? "Reprovando…" : "Confirmar reprovação"}
          </button>
        </form>
      )}
    </div>
  );
}
