import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { checklistExecutionEvents, checklistExecutions, checklistFlowEdges, checklistFlowNodes, checklistFlowSteps } from "@/db/schema";
import { getApiPermission } from "@/lib/api-auth";
import { answerIsEmpty } from "@/lib/checklist-execution";
import { selectNextEdge } from "@/lib/checklist-flow";
import { executeFlowAutomation } from "@/lib/flow-automation";
import { getOptionSource, resolveOptionSource } from "@/lib/option-sources";
import { isAdministrator } from "@/lib/permissions";
import { advanceChecklistFlowSchema } from "@/lib/validation";

const idSchema = z.string().uuid();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getApiPermission("viewChecklist");
  if ("error" in auth) return auth.error;
  const id = idSchema.safeParse((await context.params).id);
  if (!id.success) return NextResponse.json({ error: "Execução inválida." }, { status: 400 });
  const parsed = advanceChecklistFlowSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Resposta inválida." }, { status: 400 });
  const [execution] = await db.select().from(checklistExecutions).where(eq(checklistExecutions.id, id.data)).limit(1);
  if (!execution) return NextResponse.json({ error: "Execução não encontrada." }, { status: 404 });
  if (!isAdministrator(auth.user) && execution.assignedTo !== auth.user.id) return NextResponse.json({ error: "Sem acesso a esta execução." }, { status: 403 });
  if (execution.status === "completed" || execution.status === "cancelled") return NextResponse.json({ error: "Esta execução está encerrada." }, { status: 409 });
  if (execution.currentNodeId !== parsed.data.nodeId) return NextResponse.json({ error: "Este passo não é mais o passo atual da execução." }, { status: 409 });
  const [node] = await db.select().from(checklistFlowNodes).where(and(eq(checklistFlowNodes.id, parsed.data.nodeId), eq(checklistFlowNodes.checklistId, execution.checklistId))).limit(1);
  if (!node) return NextResponse.json({ error: "Bloco do fluxo não encontrado." }, { status: 404 });
  let answer = parsed.data.answer;
  if (node.type === "automatic_decision") answer = (await executeFlowAutomation(node, execution, auth.user)).value;
  if ((node.type === "question" || node.type === "action") && node.required && answerIsEmpty(answer)) return NextResponse.json({ error: `Responda: ${node.title}.` }, { status: 409 });
  if (!answerIsEmpty(answer) && (node.type === "question" || node.type === "action")) {
    const invalid = (node.fieldType === "boolean" && typeof answer !== "boolean") ||
      (node.fieldType === "number" && (typeof answer !== "number" || !Number.isFinite(answer))) ||
      ((node.fieldType === "short_text" || node.fieldType === "long_text" || node.fieldType === "date" || node.fieldType === "single_select") && typeof answer !== "string") ||
      (node.fieldType === "multi_select" && (!Array.isArray(answer) || answer.some((item) => typeof item !== "string")));
    if (invalid) return NextResponse.json({ error: `Resposta inválida em ${node.title}.` }, { status: 409 });
    if ((node.fieldType === "single_select" || node.fieldType === "multi_select") && node.sourceKey) {
      const source = await getOptionSource(node.sourceKey);
      const options = source && source.active ? await resolveOptionSource(source, { ...auth.user, branchId: execution.branchId }) : [];
      const allowed = new Set(options.map((option) => option.value)); const values = Array.isArray(answer) ? answer : [answer];
      if (values.some((value) => !allowed.has(String(value)))) return NextResponse.json({ error: `A opção informada em ${node.title} não está disponível.` }, { status: 409 });
    }
  }
  if (node.type === "observation") {
    answer = parsed.data.observation || "";
    if (node.required && !answer) return NextResponse.json({ error: `Informe a observação: ${node.title}.` }, { status: 409 });
  }
  const edges = await db.select().from(checklistFlowEdges).where(eq(checklistFlowEdges.sourceNodeId, node.id)).orderBy(asc(checklistFlowEdges.priority));
  const edge = selectNextEdge(edges.map((item) => ({ sourceKey: node.nodeKey, targetKey: item.targetNodeId, condition: item.condition, conditionValue: item.conditionValue, label: item.label, priority: item.priority })), answer);
  if (!edge) return NextResponse.json({ error: "Nenhuma conexão corresponde à resposta informada." }, { status: 409 });
  const [target] = await db.select().from(checklistFlowNodes).where(eq(checklistFlowNodes.id, edge.targetKey)).limit(1);
  if (!target) return NextResponse.json({ error: "O próximo bloco do fluxo não foi encontrado." }, { status: 409 });
  const now = new Date(); const completed = target.type === "end";
  await db.transaction(async (tx) => {
    await tx.insert(checklistFlowSteps).values({ executionId: execution.id, nodeId: node.id, answer, observation: parsed.data.observation || null, automatic: node.type === "automatic_decision", nextNodeId: target.id, userId: auth.user.id });
    await tx.update(checklistExecutions).set({ currentNodeId: target.id, status: completed ? "completed" : "in_progress", outcome: completed ? target.outcome : null, draftAnswer: null, draftObservation: null, nextAutomationAt: !completed && target.type === "automatic_decision" && target.autoIntervalMinutes ? now : null, startedAt: execution.startedAt ?? now, completedAt: completed ? now : null, updatedAt: now }).where(eq(checklistExecutions.id, execution.id));
    await tx.insert(checklistExecutionEvents).values({ executionId: execution.id, event: completed ? `completed_${target.outcome}` : "step_completed", userId: auth.user.id, data: { nodeId: node.id, nextNodeId: target.id } });
  });
  return NextResponse.json({ completed, outcome: completed ? target.outcome : null, currentNodeId: target.id, answer });
}
