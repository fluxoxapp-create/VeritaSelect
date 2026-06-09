"use client";

import { useActionState, useState, useRef, useTransition } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { savePhotoPaths } from "./actions";

const MAX_FILES = 10;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type UploadState = { error: string | null; success?: boolean } | undefined;

export function PhotoUpload({
  raffleId,
  bucket,
  fieldName,
  action,
  initialPaths,
  label,
  description,
  maxFiles = MAX_FILES,
}: {
  raffleId: string;
  bucket: "raffle-photos" | "raffle-proof";
  fieldName: string;
  action: typeof savePhotoPaths;
  initialPaths: string[];
  label: string;
  description: string;
  maxFiles?: number;
}) {
  const [paths, setPaths] = useState<string[]>(initialPaths);
  const [previews, setPreviews] = useState<{ path: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [saveState, formAction, savePending] = useActionState(action, undefined as UploadState);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadError(null);

    const toUpload = Array.from(files).slice(0, maxFiles - paths.length);

    for (const file of toUpload) {
      // Client-side validation
      if (!ALLOWED_TYPES.includes(file.type)) {
        setUploadError(`Tipo inválido: ${file.name}. Use JPG, PNG ou WEBP.`);
        return;
      }
      if (file.size > MAX_BYTES) {
        setUploadError(`${file.name} excede 5 MB.`);
        return;
      }
    }

    setUploading(true);
    const newPaths: string[] = [];
    const newPreviews: { path: string; url: string }[] = [];

    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i];
      setUploadProgress(`Enviando ${i + 1} de ${toUpload.length}…`);

      // Random file name to prevent path guessing
      const ext = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
      const name = `${raffleId}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage.from(bucket).upload(name, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (error) {
        setUploadError(`Erro ao enviar ${file.name}: ${error.message}`);
        setUploading(false);
        setUploadProgress(null);
        return;
      }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(name);
      newPaths.push(name);
      newPreviews.push({ path: name, url: urlData.publicUrl });
    }

    setUploading(false);
    setUploadProgress(null);
    setPaths((prev) => [...prev, ...newPaths]);
    setPreviews((prev) => [...prev, ...newPreviews]);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function removePhoto(path: string) {
    await supabase.storage.from(bucket).remove([path]);
    setPaths((prev) => prev.filter((p) => p !== path));
    setPreviews((prev) => prev.filter((p) => p.path !== path));
  }

  const allPaths = paths;
  const isFull = allPaths.length >= maxFiles;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted mt-0.5">{description}</p>
      </div>

      {/* Preview grid */}
      {(allPaths.length > 0 || previews.length > 0) && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {allPaths.map((path) => {
            const preview = previews.find((p) => p.path === path);
            const publicUrl = preview?.url
              ?? (bucket === "raffle-photos"
                ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
                : null);

            return (
              <div key={path} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-surface-2">
                {publicUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={publicUrl} alt="" className="w-full h-full object-cover" />
                )}
                {!publicUrl && (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted">
                    🔒
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(path)}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs font-medium"
                >
                  Remover
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload area */}
      {!isFull && (
        <label className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 transition-colors cursor-pointer ${
          uploading ? "border-gold/40 bg-gold/5" : "border-border hover:border-gold/40 hover:bg-surface-2"
        }`}>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            disabled={uploading}
            onChange={(e) => handleFiles(e.target.files)}
          />
          {uploading ? (
            <p className="text-sm text-gold-soft">{uploadProgress}</p>
          ) : (
            <>
              <p className="text-sm text-muted">
                Arraste ou clique para adicionar fotos
              </p>
              <p className="text-xs text-muted">
                JPG, PNG ou WEBP · Máx. 5 MB por foto · {maxFiles - allPaths.length} restante{maxFiles - allPaths.length !== 1 ? "s" : ""}
              </p>
            </>
          )}
        </label>
      )}

      {uploadError && (
        <p className="text-sm text-red-400 border border-red-400/20 bg-red-400/5 rounded-md px-3 py-2">
          {uploadError}
        </p>
      )}

      {/* Save button */}
      <form action={formAction}>
        <input type="hidden" name="raffleId" value={raffleId} />
        <input type="hidden" name={fieldName} value={JSON.stringify(allPaths)} />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={savePending || uploading}
            className="px-4 py-2 rounded-md border border-gold/40 text-gold-soft text-sm hover:bg-gold/10 transition-colors cursor-pointer disabled:opacity-60"
          >
            {savePending ? "Salvando…" : "Salvar fotos"}
          </button>
          {saveState?.success && (
            <p className="text-sm text-emerald-400">Salvo com sucesso.</p>
          )}
          {saveState?.error && (
            <p className="text-sm text-red-400">{saveState.error}</p>
          )}
        </div>
      </form>
    </div>
  );
}
