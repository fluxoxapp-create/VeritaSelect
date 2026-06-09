"use client";

import { useActionState, useRef, useEffect } from "react";
import { verifyPin } from "./actions";

type State = { error: string | null } | undefined;

export function PinForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(verifyPin, undefined as State);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div>
        <label className="text-sm text-muted block mb-2 text-center">PIN</label>
        <input
          ref={inputRef}
          type="password"
          name="pin"
          maxLength={4}
          inputMode="numeric"
          pattern="\d{4}"
          required
          autoComplete="off"
          placeholder="••••"
          className="w-full rounded-md border border-border bg-surface-2 px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-gold/60 transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-400 bg-red-400/5 border border-red-400/20 rounded-md px-3 py-2 text-center">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-2.5 rounded-md bg-gold text-background font-semibold hover:bg-gold-soft transition-colors cursor-pointer disabled:opacity-60"
      >
        {pending ? "Verificando..." : "Entrar"}
      </button>
    </form>
  );
}
