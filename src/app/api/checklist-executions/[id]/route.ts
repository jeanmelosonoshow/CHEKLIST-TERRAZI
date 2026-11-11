import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { checklistExecutionEvents, checklistExecutions, checklistFieldOptions, checklistFields, checklistFlowItemResponses, checklistFlowNodes, checklistFlowSteps, checklistResponses, checklists } from "@/db/schema";
import { getApiPermission } from "@/lib/api-auth";
import { validateChecklistAnswers } from "@/lib/checklist-execution";
import { getOptionSource, resolveOptionSource } from "@/lib/option-sources";
import { canManageChecklistDemand, isAdministrator, type PermissionSet } from "@/lib/permissions";
import { saveChecklistExecutionSchema } from "@/lib/validation";

const idSchema = z.string().uuid();

async function loadExecution(id: string) {
  const [row] = await db.select({ execution: checklistExecutions, checklist: checklists }).from(checklistExecutions)
    .innerJoin(checklists, eq(checklistExecutions.checklistId, checklists.id)).where(eq(checklistExecutions.id, id)).limit(1);
  return row ?? null;
}

function canView(user: { id: string; employeeId: number }, permissions: PermissionSet, assignedTo: string) {
  return isAdministrator(user) || permissions.viewAllChecklistDemands || permissions.interactAllChecklistDemands || user.id === assignedTo;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getApiPermission("viewChecklist");
  if ("error" in auth) return auth.error;
  const id = idSchema.safeParse((await context.params).id);
  if (!id.success) return NextResponse.json({ error: "Execução inválida." }, { status: 400 });
  const loaded = await loadExecution(id.data);
  if (!loaded) return NextResponse.json({ error: "Execução não encontrada." }, { status: 404 });
  if (!canView(auth.user, auth.permissions, loaded.execution.assignedTo)) return NextResponse.json({ error: "Sem acesso a esta execução." }, { status: 403 });
  const manageable = canManageChecklistDemand(auth.user, auth.permissions, loaded.execution.assignedTo);
  const flowNodes = await db.select({ id: checklistFlowNodes.id }).from(checklistFlowNodes).where(eq(checklistFlowNodes.checklistId, loaded.checklist.id)).limit(1);
  if (flowNodes.length) {
    const [current] = loaded.execution.currentNodeId ? await db.select().from(checklistFlowNodes).where(eq(checklistFlowNodes.id, loaded.execution.currentNodeId)).limit(1) : [];
    const steps = await db.select({ id: checklistFlowSteps.id, answer: checklistFlowSteps.answer, observation: checklistFlowSteps.observation, automatic: checklistFlowSteps.automatic, createdAt: checklistFlowSteps.createdAt, nodeId: checklistFlowNodes.id, nodeTitle: checklistFlowNodes.title, nodeType: checklistFlowNodes.type })
      .from(checklistFlowSteps).innerJoin(checklistFlowNodes, eq(checklistFlowSteps.nodeId, checklistFlowNodes.id))
      .where(eq(checklistFlowSteps.executionId, loaded.execution.id)).orderBy(asc(checklistFlowSteps.createdAt));
    let options: Array<{ value: string; label: string }> = [];
    if (current?.sourceKey) {
      const source = await getOptionSource(current.sourceKey);
      options = source && source.active ? await resolveOptionSource(source, { ...auth.user, branchId: loaded.execution.branchId }) : [];
    }
    const itemAnswers = current?.responseByItem ? await db.select({ itemIndex: checklistFlowItemResponses.itemIndex, success: checklistFlowItemResponses.success, observation: checklistFlowItemResponses.observation })
      .from(checklistFlowItemResponses).where(and(eq(checklistFlowItemResponses.executionId, loaded.execution.id), eq(checklistFlowItemResponses.nodeId, current.id))).orderBy(asc(checklistFlowItemResponses.itemIndex)) : [];
    return NextResponse.json({ flow: true, execution: { ...loaded.execution, canManage: manageable }, checklist: loaded.checklist, currentNode: current ? { ...current, options } : null, steps, itemAnswers });
  }
  const fields = await db.select().from(checklistFields).where(eq(checklistFields.checklistId, loaded.checklist.id)).orderBy(asc(checklistFields.position));
  const [response] = await db.select().from(checklistResponses).where(eq(checklistResponses.executionId, loaded.execution.id)).limit(1);
  const hydratedFields = await Promise.all(fields.map(async (field) => {
    if (field.sourceKey) {
      const source = await getOptionSource(field.sourceKey);
      return { ...field, options: source && source.active ? await resolveOptionSource(source, auth.user) : [] };
    }
    const options = await db.select({ value: checklistFieldOptions.value, label: checklistFieldOptions.label }).from(checklistFieldOptions)
      .where(eq(checklistFieldOptions.fieldId, field.id)).orderBy(asc(checklistFieldOptions.position));
    return { ...field, options };
  }));
  return NextResponse.json({ execution: { ...loaded.execution, canManage: manageable }, checklist: loaded.checklist, fields: hydratedFields, answers: response?.answers || {} });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getApiPermission("viewChecklist");
  if ("error" in auth) return auth.error;
  const id = idSchema.safeParse((await context.params).id);
  if (!id.success) return NextResponse.json({ error: "Execução inválida." }, { status: 400 });
  const parsed = saveChecklistExecutionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Respostas inválidas." }, { status: 400 });
  const loaded = await loadExecution(id.data);
  if (!loaded) return NextResponse.json({ error: "Execução não encontrada." }, { status: 404 });
  if (!canManageChecklistDemand(auth.user, auth.permissions, loaded.execution.assignedTo)) return NextResponse.json({ error: "Esta demanda pertence a outro usuário e está disponível somente para consulta." }, { status: 403 });
  if (loaded.execution.status === "completed" || loaded.execution.status === "cancelled") return NextResponse.json({ error: "Esta execução está encerrada." }, { status: 409 });
  const fields = await db.select().from(checklistFields).where(eq(checklistFields.checklistId, loaded.checklist.id));
  const validationError = validateChecklistAnswers(fields, parsed.data.answers, parsed.data.complete);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 409 });
  for (const field of fields.filter((item) => item.type === "single_select" || item.type === "multi_select")) {
    const answer = parsed.data.answers[field.id];
    if (answer === null || answer === undefined || answer === "" || (Array.isArray(answer) && !answer.length)) continue;
    let options: Array<{ value: string; label: string }> = [];
    if (field.sourceKey) {
      const source = await getOptionSource(field.sourceKey);
      options = source && source.active ? await resolveOptionSource(source, auth.user) : [];
    } else {
      options = await db.select({ value: checklistFieldOptions.value, label: checklistFieldOptions.label }).from(checklistFieldOptions)
        .where(eq(checklistFieldOptions.fieldId, field.id));
    }
    const allowed = new Set(options.map((option) => option.value));
    const values = Array.isArray(answer) ? answer : [answer];
    if (values.some((value) => typeof value !== "string" || !allowed.has(value))) {
      return NextResponse.json({ error: `A opção informada em ${field.label} não está disponível.` }, { status: 409 });
    }
  }
  const hasAnswers = Object.values(parsed.data.answers).some((value) => value !== null && value !== undefined && value !== "" && (!Array.isArray(value) || value.length));
  const nextStatus = parsed.data.complete ? "completed" : hasAnswers ? "in_progress" : "pending";
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(checklistResponses).set({ answers: parsed.data.answers, userId: auth.user.id, submittedAt: parsed.data.complete ? now : null, updatedAt: now }).where(eq(checklistResponses.executionId, loaded.execution.id));
    await tx.update(checklistExecutions).set({ status: nextStatus, startedAt: hasAnswers ? loaded.execution.startedAt ?? now : loaded.execution.startedAt, completedAt: parsed.data.complete ? now : null, updatedAt: now }).where(eq(checklistExecutions.id, loaded.execution.id));
    if (nextStatus !== loaded.execution.status) await tx.insert(checklistExecutionEvents).values({ executionId: loaded.execution.id, event: nextStatus, userId: auth.user.id, data: {} });
  });
  return NextResponse.json({ status: nextStatus });
}
