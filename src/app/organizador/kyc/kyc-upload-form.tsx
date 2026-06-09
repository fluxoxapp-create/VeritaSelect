"use client";

import { useActionState, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { submitKyc } from "./actions";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

type State = { error: string | null; success?: boolean } | undefined;

type KycSlot = {
  key: "selfiePath" | "docFrontPath" | "docBackPath";
  label: string;
  hint: string;
  icon: string;
};

const SLOTS: KycSlot[] = [
  {
    key: "selfiePath",
    label: "Selfie segurando o documento",
    hint: "Tire uma foto do seu rosto com o documento visível ao lado. Fundo claro, rosto desobstruído.",
    icon: "🤳",
  },
  {
    key: "docFrontPath",
    label: "Documento — frente",
    hint: "RG ou CNH. Foto nítida, sem reflexo, sem cortes. Todos os dados devem estar legíveis.",
    icon: "🪪",
  },
  {
    key: "docBackPath",
    label: "Documento — verso",
    hint: "Foto do verso do mesmo documento.",
    icon: "🪪",
  },
];

export function KycUploadForm({
  userId,
  initialPaths,
}: {
  userId: string;
  initialPaths: { selfie: string | null; front: string | null; back: string | null };
}) {
  const [paths, setPaths] = useState<Record<string, string | null>>({
    selfiePath: initialPaths.selfie,
    docFrontPath: initialPaths.front,
    docBackPath: initialPaths.back,
  });
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [state, action, pending] = useActionState(submitKyc, undefined as State);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  async function handleUpload(slot: KycSlot["key"], file: File) {
    setUploadError(null);

    if (!ALLOWED.includes(file.type)) {
      setUploadError("Tipo inválido. Use JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError("Arquivo excede 10 MB.");
      return;
    }

    setUploading(slot);
    const ext = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
    const name = `${userId}/${slot}_${Date.now()}.${ext}`;

    // Remove old if exists
    if (paths[slot]) {
      await supabase.storage.from("kyc-docs").remove([paths[slot]!]);
    }

    const { error } = await supabase.storage.from("kyc-docs").upload(name, file, {
      cacheControl: "3600",
      upsert: true,
    });

    setUploading(null);

    if (error) {
      setUploadError(`Erro ao enviar: ${error.message}`);
      return;
    }

    setPaths((prev) => ({ ...prev, [slot]: name }));
  }

  const allUploaded = SLOTS.every((s) => paths[s.key]);

  if (state?.success) {
    return (
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-6 text-center space-y-2">
        <p className="text-lg font-semibold text-emerald-300">Verificação enviada!</p>
        <p className="text-sm text-muted">
          Nossa equipe analisará os documentos em até 2 dias úteis. Você receberá uma
          notificação quando a verificação for concluída.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      {SLOTS.map((slot) => {
        const uploaded = !!paths[slot.key];
        return (
          <div key={slot.key} className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{slot.icon}</span>
              <div>
                <p className="font-medium text-sm">{slot.label}</p>
                <p className="text-xs text-muted mt-0.5">{slot.hint}</p>
              </div>
              {uploaded && (
                <span className="ml-auto text-xs text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full shrink-0">
                  ✓ Enviado
                </span>
              )}
            </div>

            <label className={`flex items-center justify-center gap-2 rounded-lg border-2 border-dashed px-5 py-4 transition-colors cursor-pointer text-sm ${
              uploading === slot.key
                ? "border-gold/40 bg-gold/5 text-gold-soft"
                : uploaded
                  ? "border-emerald-400/40 bg-emerald-400/5 text-emerald-300 hover:bg-emerald-400/10"
                  : "border-border text-muted hover:border-gold/40 hover:bg-surface-2"
            }`}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={!!uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(slot.key, file);
                }}
              />
              {uploading === slot.key
                ? "Enviando…"
                : uploaded
                  ? "Trocar foto"
                  : "Clique para enviar"}
            </label>

            <input type="hidden" name={slot.key} value={paths[slot.key] ?? ""} />
          </div>
        );
      })}

      {uploadError && (
        <p className="text-sm text-red-400 border border-red-400/20 bg-red-400/5 rounded-md px-3 py-2">
          {uploadError}
        </p>
      )}
      {state?.error && (
        <p className="text-sm text-red-400 border border-red-400/20 bg-red-400/5 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !!uploading || !allUploaded}
        className="w-full py-3 rounded-md bg-gold text-background font-semibold hover:bg-gold-soft transition-colors disabled:opacity-60 cursor-pointer"
      >
        {pending ? "Enviando verificação…" : "Enviar para análise"}
      </button>

      {!allUploaded && (
        <p className="text-xs text-center text-muted">
          Envie as 3 fotos para habilitar o botão de envio.
        </p>
      )}
    </form>
  );
}
