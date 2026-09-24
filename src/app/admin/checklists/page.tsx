import { desc, eq, sql } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { ChecklistBuilder } from "@/components/ChecklistBuilder";
import { ChecklistEditor } from "@/components/ChecklistEditor";
import { db } from "@/db";
import { checklistFields, checklists, syncedSources } from "@/db/schema";
import { requireAnyPermission } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminChecklistsPage() {
  const { user, permissions } = await requireAnyPermission(["createChecklist", "editChecklist"]);
  const [items, sources] = await Promise.all([
    db.select({ id: checklists.id, title: checklists.title, description: checklists.description, status: checklists.status, updatedAt: checklists.updatedAt, fieldCount: sql<number>`count(${checklistFields.id})::int` }).from(checklists).leftJoin(checklistFields, eq(checklists.id, checklistFields.checklistId)).groupBy(checklists.id).orderBy(desc(checklists.updatedAt)),
    db.select({ key: syncedSources.key, label: syncedSources.label }).from(syncedSources).where(eq(syncedSources.active, true)),
  ]);
  return (
    <AppShell user={user} permissions={permissions} active="management">
      <section className="heroRow"><div><p className="eyebrow">GESTÃO</p><h1>Checklists</h1><p className="muted">Crie e organize os fluxos que serão usados pela equipe.</p></div>{permissions.createChecklist && <ChecklistBuilder sources={sources} />}</section>
      <section className="statsGrid compact"><article className="statCard"><span>Total</span><strong>{items.length}</strong><small>checklists</small></article><article className="statCard"><span>Publicados</span><strong>{items.filter((item) => item.status === "published").length}</strong><small>visíveis para a equipe</small></article><article className="statCard accent"><span>Rascunhos</span><strong>{items.filter((item) => item.status === "draft").length}</strong><small>em preparação</small></article></section>
      <section className="sectionBlock"><div className="sectionHeading"><div><p className="eyebrow">BIBLIOTECA</p><h2>Todos os checklists</h2></div><span className="sourceInfo">{sources.length} fonte(s) sincronizada(s)</span></div>
        {items.length ? <div className="tableWrap responsiveTable"><table><thead><tr><th>Checklist</th><th>Status</th><th>Campos</th><th>Atualizado</th>{permissions.editChecklist && <th>Ações</th>}</tr></thead><tbody>{items.map((item) => <tr key={item.id}><td data-label="Checklist"><strong>{item.title}</strong><small>{item.description || "Sem descrição"}</small></td><td data-label="Status"><span className={`status ${item.status}`}>{item.status === "draft" ? "Rascunho" : item.status === "published" ? "Publicado" : "Arquivado"}</span></td><td data-label="Campos">{item.fieldCount}</td><td data-label="Atualizado">{new Intl.DateTimeFormat("pt-BR").format(item.updatedAt)}</td>{permissions.editChecklist && <td data-label="Ações">{item.status === "draft" ? <ChecklistEditor checklistId={item.id} sources={sources} /> : <span className="muted">Bloqueado</span>}</td>}</tr>)}</tbody></table></div> : <div className="emptyState"><span>☷</span><h3>Seu primeiro checklist começa aqui</h3><p>Crie um rascunho, adicione perguntas e conecte fontes sincronizadas.</p></div>}
      </section>
    </AppShell>
  );
}
