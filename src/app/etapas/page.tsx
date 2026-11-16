import { asc, eq, inArray, ne } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { StagesBoard } from "@/components/StagesBoard";
import { db } from "@/db";
import { checklistExecutions, checklistFlowItemResponses, checklistFlowNodes, checklistFlowSteps, checklists } from "@/db/schema";
import { identifyStage, stageDefinitions, type StageProcessRow, type StageStatus } from "@/lib/stages";
import { requirePermission } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StagesPage() {
  const { user, permissions } = await requirePermission("stages");
  const executions = await db.select({ execution: checklistExecutions, checklistTitle: checklists.title, currentNodeTitle: checklistFlowNodes.title })
    .from(checklistExecutions).innerJoin(checklists, eq(checklistExecutions.checklistId, checklists.id))
    .leftJoin(checklistFlowNodes, eq(checklistExecutions.currentNodeId, checklistFlowNodes.id))
    .where(ne(checklistExecutions.status, "cancelled")).orderBy(asc(checklistExecutions.branchId), asc(checklistExecutions.saleNumber));
  const executionIds = executions.map((row) => row.execution.id); const checklistIds = [...new Set(executions.map((row) => row.execution.checklistId))];
  const [nodes, steps, itemResponses] = await Promise.all([
    checklistIds.length ? db.select({ id: checklistFlowNodes.id, checklistId: checklistFlowNodes.checklistId, title: checklistFlowNodes.title }).from(checklistFlowNodes).where(inArray(checklistFlowNodes.checklistId, checklistIds)) : [],
    executionIds.length ? db.select({ executionId: checklistFlowSteps.executionId, nodeId: checklistFlowSteps.nodeId, answer: checklistFlowSteps.answer, title: checklistFlowNodes.title }).from(checklistFlowSteps).innerJoin(checklistFlowNodes, eq(checklistFlowSteps.nodeId, checklistFlowNodes.id)).where(inArray(checklistFlowSteps.executionId, executionIds)) : [],
    executionIds.length ? db.select({ executionId: checklistFlowItemResponses.executionId, nodeId: checklistFlowItemResponses.nodeId, success: checklistFlowItemResponses.success }).from(checklistFlowItemResponses).where(inArray(checklistFlowItemResponses.executionId, executionIds)) : [],
  ]);
  const rows: StageProcessRow[] = executions.map(({ execution, checklistTitle, currentNodeTitle }) => {
    const available = new Set(nodes.filter((node) => node.checklistId === execution.checklistId).map((node) => identifyStage(node.title)).filter(Boolean));
    const executionSteps = steps.filter((step) => step.executionId === execution.id); const currentStage = currentNodeTitle ? identifyStage(currentNodeTitle) : null;
    const stages = Object.fromEntries(stageDefinitions.map((definition) => {
      const matchingSteps = executionSteps.filter((step) => identifyStage(step.title) === definition.key);
      if (matchingSteps.length) {
        const last = matchingSteps.at(-1)!; const productResults = itemResponses.filter((item) => item.executionId === execution.id && item.nodeId === last.nodeId);
        let status: StageStatus = "completed";
        if (productResults.length && productResults.some((item) => item.success) && productResults.some((item) => !item.success)) status = "partiallyCompleted";
        else if (last.answer === false || (productResults.length && productResults.every((item) => !item.success))) status = "notPerformed";
        return [definition.key, status];
      }
      if (!available.has(definition.key)) return [definition.key, "notApplicable"];
      if (currentStage === definition.key || execution.status !== "completed") return [definition.key, "pending"];
      return [definition.key, "notApplicable"];
    })) as StageProcessRow["stages"];
    return { id: execution.id, branch: execution.branchId, sale: execution.saleNumber, customerName: execution.customerName || "", checklistTitle, currentStage: currentNodeTitle, stages };
  });

  return <AppShell user={user} permissions={permissions} active="stages">
    <section className="heroRow"><div><p className="eyebrow">ACOMPANHAMENTO</p><h1>Etapas</h1><p className="muted">Acompanhe o andamento de cada venda, da separação à montagem.</p></div></section>
    <section className="sectionBlock"><StagesBoard rows={rows} /></section>
  </AppShell>;
}
