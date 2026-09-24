import { AppShell } from "@/components/AppShell";
import { requirePermission } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const { user, permissions } = await requirePermission("reports");
  return <AppShell user={user} permissions={permissions} active="reports">
    <section className="heroRow"><div><p className="eyebrow">ANÁLISE</p><h1>Relatórios</h1><p className="muted">Acesso autorizado para a sua categoria.</p></div></section>
    <section className="sectionBlock"><div className="emptyState"><span>↗</span><h3>Relatórios em preparação</h3><p>Os indicadores serão disponibilizados nesta área.</p></div></section>
  </AppShell>;
}
