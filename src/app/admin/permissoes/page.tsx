import { asc, isNotNull } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { PermissionsEditor } from "@/components/PermissionsEditor";
import { db } from "@/db";
import { categoryPermissions, users } from "@/db/schema";
import { NO_PERMISSIONS } from "@/lib/permission-policy";
import { getUserPermissions } from "@/lib/permissions";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PermissionsPage() {
  const user = await requireAdmin();
  const permissions = await getUserPermissions(user);
  const [categories, configured] = await Promise.all([
    db.selectDistinct({ category: users.category }).from(users).where(isNotNull(users.category)).orderBy(asc(users.category)),
    db.select().from(categoryPermissions).orderBy(asc(categoryPermissions.category)),
  ]);
  const configuredByCategory = new Map(configured.map((item) => [item.category, item]));
  const categoryNames = Array.from(new Set([
    ...categories.map((item) => item.category).filter((category): category is string => Boolean(category)),
    ...configured.map((item) => item.category),
  ])).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const rows = categoryNames.map((category) => {
    const item = configuredByCategory.get(category);
    return { category, configured: Boolean(item), viewChecklist: item?.viewChecklist ?? NO_PERMISSIONS.viewChecklist, createChecklist: item?.createChecklist ?? NO_PERMISSIONS.createChecklist, editChecklist: item?.editChecklist ?? NO_PERMISSIONS.editChecklist, reports: item?.reports ?? NO_PERMISSIONS.reports, dashboard: item?.dashboard ?? NO_PERMISSIONS.dashboard, stages: item?.stages ?? NO_PERMISSIONS.stages };
  });

  return <AppShell user={user} permissions={permissions} active="permissions">
    <section className="heroRow"><div><p className="eyebrow">ADMINISTRAÇÃO</p><h1>Permissões por categoria</h1><p className="muted">Categorias sem configuração permanecem sem acesso. O funcionário 752 sempre tem acesso total.</p></div></section>
    <section className="sectionBlock">{rows.length ? <PermissionsEditor initialRows={rows} /> : <div className="emptyState"><span>!</span><h3>Nenhuma categoria sincronizada</h3><p>Sincronize os funcionários para configurar suas categorias.</p></div>}</section>
  </AppShell>;
}
