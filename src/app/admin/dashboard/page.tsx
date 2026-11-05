import { asc } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { DashboardScenarioManager } from "@/components/DashboardScenarioManager";
import { db } from "@/db";
import { dashboardScenarios } from "@/db/schema";
import { getUserPermissions } from "@/lib/permissions";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardConfigurationPage() {
  const user = await requireAdmin();
  const permissions = await getUserPermissions(user);
  const scenarios = await db.select().from(dashboardScenarios).orderBy(asc(dashboardScenarios.position), asc(dashboardScenarios.title));
  return <AppShell user={user} permissions={permissions} active="dashboardSettings">
    <section className="heroRow">
      <div><p className="eyebrow">CONFIGURAÇÃO</p><h1>Cenários do dashboard</h1><p className="muted">Crie cards e gráficos alimentados diretamente pelo SonoShowGateway.</p></div>
    </section>
    <section className="sectionBlock"><DashboardScenarioManager initialScenarios={scenarios.map((scenario) => ({ ...scenario, createdAt: scenario.createdAt.toISOString(), updatedAt: scenario.updatedAt.toISOString() }))} /></section>
  </AppShell>;
}
