import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { checklistExecutionEvents, checklistExecutions, checklistFlowEdges, checklistFlowNodes, checklistResponses, checklists } from "@/db/schema";
import { getApiPermission } from "@/lib/api-auth";
import { startChecklistExecutionSchema } from "@/lib/validation";
import { selectNextEdge } from "@/lib/checklist-flow";
import { executeFlowAutomation, mapAutomationItems, readAutomationField } from "@/lib/flow-automation";

export async function POST(request: Request) {
  const auth = await getApiPermission("viewChecklist");
  if ("error" in auth) return auth.error;
  const parsed = startChecklistExecutionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Informe checklist, filial e venda." }, { status: 400 });
  const [checklist] = await db.select({ id: checklists.id }).from(checklists).where(and(eq(checklists.id, parsed.data.checklistId), eq(checklists.status, "published"))).limit(1);
  if (!checklist) return NextResponse.json({ error: "Checklist publicado não encontrado." }, { status: 404 });
  const [existing] = await db.select({ id: checklistExecutions.id }).from(checklistExecutions).where(and(
    eq(checklistExecutions.checklistId, checklist.id), eq(checklistExecutions.branchId, parsed.data.branchId),
    eq(checklistExecutions.saleNumber, parsed.data.saleNumber), inArray(checklistExecutions.status, ["pending", "in_progress"]),
  )).limit(1);
  if (existing) return NextResponse.json({ error: "Já existe uma execução pendente deste checklist para a venda.", executionId: existing.id }, { status: 409 });
  const [startNode] = await db.select().from(checklistFlowNodes).where(and(eq(checklistFlowNodes.checklistId, checklist.id), eq(checklistFlowNodes.type, "start"))).limit(1);
  let currentNodeId: string | null = null;
  let nextAutomationAt: Date | null = null;
  let customerName: string | null = null;
  let saleItems: Array<{ code: string; description: string; quantity: string | number }> = [];
  if (startNode) {
    const edges = await db.select().from(checklistFlowEdges).where(eq(checklistFlowEdges.sourceNodeId, startNode.id)).orderBy(checklistFlowEdges.priority);
    let selectedTargetNodeId: string | null = edges[0]?.targetNodeId ?? null;
    if (startNode.automationSource) {
      try {
        const result = await executeFlowAutomation(startNode, { branchId: parsed.data.branchId, saleNumber: parsed.data.saleNumber }, auth.user);
        const selectedEdge = selectNextEdge(edges.map((edge) => ({ sourceKey: startNode.nodeKey, targetKey: edge.targetNodeId, condition: edge.condition, conditionValue: edge.conditionValue, label: edge.label, priority: edge.priority })), result.value);
        selectedTargetNodeId = selectedEdge?.targetKey ?? null;
        if (startNode.customerResultField) {
          const customerRow = result.rows.find((row) => readAutomationField(row, startNode.customerResultField!) !== null && readAutomationField(row, startNode.customerResultField!) !== undefined) || result.row;
          const customer = readAutomationField(customerRow, startNode.customerResultField);
          customerName = customer === null || customer === undefined ? null : String(customer);
        }
        saleItems = mapAutomationItems(result.rows, startNode);
      } catch (error) {
        const status = error instanceof Error && "status" in error ? Number(error.status) || 409 : 409;
        return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível validar a venda." }, { status });
      }
      if (!selectedTargetNodeId) return NextResponse.json({ error: "Venda não localizada ou não atende à validação inicial. Nenhuma demanda foi criada." }, { status: 422 });
    }
    if (!selectedTargetNodeId) return NextResponse.json({ error: "O fluxo publicado não possui uma saída a partir do início." }, { status: 409 });
    currentNodeId = selectedTargetNodeId;
    const [currentNode] = await db.select({ type: checklistFlowNodes.type, interval: checklistFlowNodes.autoIntervalMinutes }).from(checklistFlowNodes).where(eq(checklistFlowNodes.id, currentNodeId)).limit(1);
    if (currentNode?.type === "automatic_decision" && currentNode.interval) nextAutomationAt = new Date();
  }
  let execution;
  try {
    execution = await db.transaction(async (tx) => {
      const [created] = await tx.insert(checklistExecutions).values({
        checklistId: checklist.id, branchId: parsed.data.branchId, saleNumber: parsed.data.saleNumber,
        customerName, saleItems, assignedTo: auth.user.id, createdBy: auth.user.id, currentNodeId, nextAutomationAt,
      }).returning();
      await tx.insert(checklistResponses).values({ checklistId: checklist.id, executionId: created.id, userId: auth.user.id, answers: {} });
      await tx.insert(checklistExecutionEvents).values({ executionId: created.id, event: "created", userId: auth.user.id, data: { branchId: created.branchId, saleNumber: created.saleNumber } });
      return created;
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "Já existe uma execução pendente deste checklist para a venda." }, { status: 409 });
    throw error;
  }
  return NextResponse.json({ execution }, { status: 201 });
}
