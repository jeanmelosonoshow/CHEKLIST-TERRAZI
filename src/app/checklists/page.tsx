import { asc, eq } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { db } from "@/db";
import { checklists } from "@/db/schema";
import { requirePermission } from "@/lib/session";
import { formatHumanCode } from "@/lib/human-code";

export const dynamic = "force-dynamic";

export default async function ChecklistsPage() {
  const { user, permissions } = await requirePermission("viewChecklist");
  const items = await db.select().from(checklists).where(eq(checklists.status, "published")).orderBy(asc(checklists.title));
  return <AppShell user={user} permissions={permissions} active="checklists">
    <section className="heroRow"><div><p className="eyebrow">FLUXOS</p><h1>Checklists</h1><p className="muted">Checklists publicados e disponíveis para sua categoria.</p></div></section>
    <section className="sectionBlock">{items.length ? <div className="cardGrid">{items.map((item) => <article className="checklistCard" key={item.id}><span className="status published">Publicado</span><small className="entityCode">{formatHumanCode("CHK", item.code)}</small><h3>{item.title}</h3><p>{item.description || "Sem descrição."}</p><button className="secondaryButton" disabled>Iniciar em breve</button></article>)}</div> : <div className="emptyState"><span>✓</span><h3>Nenhum checklist publicado</h3><p>Os checklists disponíveis aparecerão aqui.</p></div>}</section>
  </AppShell>;
}
