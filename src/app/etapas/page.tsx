import { AppShell } from "@/components/AppShell";
import { StagesBoard } from "@/components/StagesBoard";
import type { StageProcessRow } from "@/lib/stages";
import { requirePermission } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StagesPage() {
  const { user, permissions } = await requirePermission("stages");
  const rows: StageProcessRow[] = [];

  return <AppShell user={user} permissions={permissions} active="stages">
    <section className="heroRow"><div><p className="eyebrow">ACOMPANHAMENTO</p><h1>Etapas</h1><p className="muted">Acompanhe o andamento de cada venda, da separação à montagem.</p></div></section>
    <section className="sectionBlock"><StagesBoard rows={rows} /></section>
  </AppShell>;
}
