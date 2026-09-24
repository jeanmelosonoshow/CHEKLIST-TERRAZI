import { asc, eq } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { db } from "@/db";
import { checklists } from "@/db/schema";
import { requirePermission } from "@/lib/session";
import { formatHumanCode } from "@/lib/human-code";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user, permissions } = await requirePermission("dashboard");
  const available = permissions.viewChecklist
    ? await db.select().from(checklists).where(eq(checklists.status, "published")).orderBy(asc(checklists.title))
    : [];
  return (
    <AppShell user={user} permissions={permissions} active="dashboard">
      <section className="heroRow">
        <div><p className="eyebrow">VISÃO GERAL</p><h1>Olá, {user.employeeName.split(" ")[0]}.</h1><p className="muted">Continue seus processos e acompanhe o que precisa de atenção.</p></div>
        <div className="branchPill">Filial {user.branchId}</div>
      </section>
      <section className="statsGrid">
        <article className="statCard"><span>Disponíveis</span><strong>{available.length}</strong><small>checklists publicados</small></article>
        <article className="statCard accent"><span>Pendentes</span><strong>0</strong><small>para concluir</small></article>
        <article className="statCard"><span>Concluídos</span><strong>0</strong><small>neste mês</small></article>
      </section>
      {permissions.viewChecklist && <section className="sectionBlock">
        <div className="sectionHeading"><div><p className="eyebrow">MEUS FLUXOS</p><h2>Checklists disponíveis</h2></div></div>
        {available.length ? <div className="cardGrid">{available.map((item) => <article className="checklistCard" key={item.id}><span className="status published">Publicado</span><small className="entityCode">{formatHumanCode("CHK", item.code)}</small><h3>{item.title}</h3><p>{item.description || "Sem descrição."}</p><button className="secondaryButton" disabled>Iniciar em breve</button></article>)}</div>
          : <div className="emptyState"><span>✓</span><h3>Tudo organizado por aqui</h3><p>Os checklists publicados aparecerão nesta área.</p></div>}
      </section>}
    </AppShell>
  );
}
