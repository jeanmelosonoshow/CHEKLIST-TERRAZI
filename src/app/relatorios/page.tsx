import { asc, eq } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { ReportWorkspace } from "@/components/ReportWorkspace";
import { db } from "@/db";
import { reportDefinitions } from "@/db/schema";
import { isAdministrator } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const { user, permissions } = await requirePermission("reports");
  const administrator = isAdministrator(user);
  const reports = await db.select().from(reportDefinitions).where(administrator ? undefined : eq(reportDefinitions.active, true)).orderBy(asc(reportDefinitions.title));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const defaultPeriod = { from: `${today.slice(0, 7)}-01`, to: today };
  return <AppShell user={user} permissions={permissions} active="reports">
    <section className="heroRow"><div><p className="eyebrow">ANÁLISE</p><h1>Relatórios</h1><p className="muted">Consultas livres usando Firebird, PostgreSQL ou a combinação das duas fontes.</p></div></section>
    <section className="sectionBlock"><ReportWorkspace initialReports={reports.map((report) => ({ id: report.id, title: report.title, description: report.description, dataSource: report.dataSource, primarySql: report.primarySql, secondarySql: report.secondarySql, combineMode: report.combineMode, joinFields: report.joinFields, active: report.active }))} canEdit={administrator} defaultBranch={user.branchId} defaultPeriod={defaultPeriod} /></section>
  </AppShell>;
}
