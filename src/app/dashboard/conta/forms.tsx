"use client";

import { useActionState } from "react";
import { changePassword, requestEmailChange } from "./actions";

const inputClass =
  "w-full rounded-md border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-gold/60";
const labelClass = "text-sm text-muted block mb-1.5";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, undefined);

  return (
    <form action={formAction} className="space-y-4 max-w-md">
      <div>
        <label className={labelClass}>Senha atual</label>
        <input
          type="password"
          name="currentPassword"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Nova senha</label>
        <input
          type="password"
          name="newPassword"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="••••••••"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Confirmar nova senha</label>
        <input
          type="password"
          name="confirmPassword"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="••••••••"
          className={inputClass}
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-400 border border-red-400/30 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-gold-soft border border-gold/30 rounded-md px-3 py-2">
          {state.success}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="px-6 py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold-soft transition-colors disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Alterar senha"}
      </button>
    </form>
  );
}

export function ChangeEmailForm() {
  const [state, formAction, pending] = useActionState(requestEmailChange, undefined);

  return (
    <form action={formAction} className="space-y-4 max-w-md">
      <div>
        <label className={labelClass}>Novo e-mail</label>
        <input
          type="email"
          name="newEmail"
          required
          placeholder="novo@email.com"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Confirme com sua senha atual</label>
        <input
          type="password"
          name="currentPassword"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className={inputClass}
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-400 border border-red-400/30 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-gold-soft border border-gold/30 rounded-md px-3 py-2">
          {state.success}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="px-6 py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold-soft transition-colors disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Solicitar troca de e-mail"}
      </button>
    </form>
  );
}
