import { and, asc, desc, eq } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { ChecklistExecutionWorkspace } from "@/components/ChecklistExecutionWorkspace";
import { db } from "@/db";
import { checklistExecutions, checklists } from "@/db/schema";
import { isAdministrator } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ChecklistsPage() {
  const { user, permissions } = await requirePermission("viewChecklist");
  const [templates, executionRows] = await Promise.all([
    db.select({ id: checklists.id, code: checklists.code, title: checklists.title, description: checklists.description })
      .from(checklists).where(eq(checklists.status, "published")).orderBy(asc(checklists.title)),
    db.select({ execution: checklistExecutions, checklistTitle: checklists.title, checklistCode: checklists.code })
      .from(checklistExecutions).innerJoin(checklists, eq(checklistExecutions.checklistId, checklists.id))
      .where(isAdministrator(user) ? undefined : and(eq(checklistExecutions.branchId, user.branchId)))
      .orderBy(desc(checklistExecutions.updatedAt)),
  ]);
  const executions = executionRows.map(({ execution, ...row }) => ({ ...execution, ...row,
    startedAt: execution.startedAt?.toISOString() ?? null, completedAt: execution.completedAt?.toISOString() ?? null,
    createdAt: execution.createdAt.toISOString(), updatedAt: execution.updatedAt.toISOString(),
  }));
  return <AppShell user={user} permissions={permissions} active="checklists">
    <ChecklistExecutionWorkspace templates={templates} initialExecutions={executions} defaultBranchId={user.branchId} administrator={isAdministrator(user)} />
  </AppShell>;
}
