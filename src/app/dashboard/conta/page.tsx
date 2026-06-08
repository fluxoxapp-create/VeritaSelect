import { Suspense } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ChangeEmailForm, ChangePasswordForm } from "./forms";

async function AccountStatus() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
        <p className="text-muted text-sm mb-4">Você precisa entrar para gerenciar sua conta.</p>
        <Link
          href="/entrar"
          className="inline-block px-6 py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold-soft transition-colors"
        >
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-semibold mb-1">E-mail cadastrado</h2>
        <p className="text-sm text-muted mb-4">{user.email}</p>
        <ChangeEmailForm />
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-semibold mb-1">Alterar senha</h2>
        <p className="text-sm text-muted mb-4">
          Por segurança, pedimos sua senha atual antes de definir uma nova — e
          encerramos automaticamente outras sessões abertas em outros aparelhos.
        </p>
        <ChangePasswordForm />
      </section>

      <section className="rounded-xl border border-gold/30 bg-surface p-6 text-sm text-muted">
        <h2 className="font-semibold text-foreground mb-1">Sobre a segurança da sua conta</h2>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Nunca compartilhamos links de redefinição de senha por telefone, WhatsApp ou redes sociais.</li>
          <li>Trocas de e-mail exigem confirmação tanto no e-mail atual quanto no novo.</li>
          <li>Alterar sua senha encerra suas sessões em outros dispositivos automaticamente.</li>
        </ul>
        <p className="mt-3">
          Saiba mais em nossa{" "}
          <Link href="/seguranca" className="text-gold-soft hover:text-gold">
            Central de Segurança
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

export default function ContaPage({
  searchParams,
}: {
  searchParams: Promise<{ email_alterado?: string }>;
}) {
  return (
    <DashboardShell title="Sua conta" description="Gerencie suas credenciais de acesso.">
      <Suspense fallback={null}>
        <EmailChangedBanner searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<div className="text-sm text-muted">Carregando...</div>}>
        <AccountStatus />
      </Suspense>
    </DashboardShell>
  );
}

async function EmailChangedBanner({
  searchParams,
}: {
  searchParams: Promise<{ email_alterado?: string }>;
}) {
  const params = await searchParams;
  if (!params.email_alterado) return null;

  return (
    <p className="text-sm text-gold-soft border border-gold/30 rounded-md px-3 py-2 mb-6">
      Seu e-mail foi confirmado e atualizado com sucesso.
    </p>
  );
}
