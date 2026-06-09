"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkComprasPin, createComprasToken, ADMIN_COMPRAS_COOKIE } from "@/lib/admin-compras-auth";

export async function verifyPin(
  _prevState: { error: string | null } | undefined,
  formData: FormData,
) {
  const pin = String(formData.get("pin") ?? "").trim();
  const next = String(formData.get("next") ?? "/admin/compras").trim();

  if (!/^\d{4}$/.test(pin)) {
    return { error: "PIN deve ter exatamente 4 dígitos." };
  }

  if (!checkComprasPin(pin)) {
    return { error: "PIN incorreto." };
  }

  const token = await createComprasToken();
  const jar = await cookies();
  jar.set(ADMIN_COMPRAS_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 2 * 60 * 60, // 2h
    path: "/admin/compras",
  });

  redirect(next.startsWith("/admin") ? next : "/admin/compras");
}
