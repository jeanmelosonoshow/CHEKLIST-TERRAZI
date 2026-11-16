import { asc, eq, inArray, ne } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { StagesBoard } from "@/components/StagesBoard";
import { db } from "@/db";
import { checklistExecutions, checklistFlowItemResponses, checklistFlowNodes, checklistFlowSteps, checklists } from "@/db/schema";
import { calculateStageSuccess, identifyItemConferenceStage, identifyStage, identifyStageStatusStep, isFailedStageAnswer, isStageApplicabilityQuestion, stageDefinitions, type StageProcessRow, type StageStatus } from "@/lib/stages";
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
    executionIds.length ? db.select({ executionId: checklistFlowSteps.executionId, nodeId: checklistFlowSteps.nodeId, answer: checklistFlowSteps.answer, title: checklistFlowNodes.title }).from(checklistFlowSteps).innerJoin(checklistFlowNodes, eq(checklistFlowSteps.nodeId, checklistFlowNodes.id)).where(inArray(checklistFlowSteps.executionId, executionIds)).orderBy(asc(checklistFlowSteps.id)) : [],
    executionIds.length ? db.select({ executionId: checklistFlowItemResponses.executionId, nodeId: checklistFlowItemResponses.nodeId, success: checklistFlowItemResponses.success }).from(checklistFlowItemResponses).where(inArray(checklistFlowItemResponses.executionId, executionIds)) : [],
  ]);
  const rows: StageProcessRow[] = executions.map(({ execution, checklistTitle, currentNodeTitle }) => {
    const available = new Set(nodes.filter((node) => node.checklistId === execution.checklistId).map((node) => identifyStage(node.title)).filter(Boolean));
    const executionSteps = steps.filter((step) => step.executionId === execution.id); const currentStage = currentNodeTitle ? identifyStageStatusStep(currentNodeTitle) : null;
    const stages = Object.fromEntries(stageDefinitions.map((definition) => {
      if (currentStage === definition.key) return [definition.key, "pending"];
      const matchingSteps = executionSteps.filter((step) => identifyStageStatusStep(step.title) === definition.key);
      if (matchingSteps.length) {
        const applicabilitySteps = matchingSteps.filter((step) => isStageApplicabilityQuestion(step.title));
        const lastApplicability = applicabilitySteps.at(-1);
        if (lastApplicability && isFailedStageAnswer(lastApplicability.answer)) return [definition.key, "notApplicable"];
        const operationalSteps = matchingSteps.filter((step) => !isStageApplicabilityQuestion(step.title));
        if (!operationalSteps.length) return [definition.key, "pending"];
        const last = operationalSteps.at(-1)!; const productResults = itemResponses.filter((item) => item.executionId === execution.id && item.nodeId === last.nodeId);
        let status: StageStatus = "completed";
        if (productResults.some((item) => !item.success)) status = "partiallyCompleted";
        else if (isFailedStageAnswer(last.answer)) status = "notPerformed";
        return [definition.key, status];
      }
      if (!available.has(definition.key)) return [definition.key, "notApplicable"];
      if (execution.status !== "completed") return [definition.key, "pending"];
      return [definition.key, "notApplicable"];
    })) as StageProcessRow["stages"];
    const nodeTitleById = new Map(nodes.filter((node) => node.checklistId === execution.checklistId).map((node) => [node.id, node.title]));
    for (const item of itemResponses.filter((response) => response.executionId === execution.id && !response.success)) {
      const itemStage = identifyItemConferenceStage(nodeTitleById.get(item.nodeId) || "");
      if (itemStage && stages[itemStage] !== "notApplicable") stages[itemStage] = "partiallyCompleted";
    }
    return { id: execution.id, branch: execution.branchId, sale: execution.saleNumber, customerName: execution.customerName || "", checklistTitle, currentStage: currentNodeTitle, stages, successPercentage: calculateStageSuccess(stages), checklistStatus: execution.status as StageProcessRow["checklistStatus"], outcome: execution.outcome, createdAt: execution.createdAt.toISOString() };
  });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const defaultPeriod = { from: `${today.slice(0, 7)}-01`, to: today };

  return <AppShell user={user} permissions={permissions} active="stages" wide>
    <section className="heroRow"><div><p className="eyebrow">ACOMPANHAMENTO</p><h1>Etapas</h1><p className="muted">Acompanhe o andamento de cada venda, da separação à montagem.</p></div></section>
    <section className="sectionBlock"><StagesBoard rows={rows} defaultPeriod={defaultPeriod} /></section>
  </AppShell>;
}
