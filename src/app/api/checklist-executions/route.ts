import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { checklistExecutionEvents, checklistExecutions, checklistFlowEdges, checklistFlowNodes, checklistResponses, checklists } from "@/db/schema";
import { getApiPermission } from "@/lib/api-auth";
import { isAdministrator } from "@/lib/permissions";
import { startChecklistExecutionSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const auth = await getApiPermission("viewChecklist");
  if ("error" in auth) return auth.error;
  const parsed = startChecklistExecutionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Informe checklist, filial e venda." }, { status: 400 });
  if (!isAdministrator(auth.user) && parsed.data.branchId !== auth.user.branchId) return NextResponse.json({ error: "Você só pode iniciar checklists para sua filial." }, { status: 403 });
  const [checklist] = await db.select({ id: checklists.id }).from(checklists).where(and(eq(checklists.id, parsed.data.checklistId), eq(checklists.status, "published"))).limit(1);
  if (!checklist) return NextResponse.json({ error: "Checklist publicado não encontrado." }, { status: 404 });
  const [existing] = await db.select({ id: checklistExecutions.id }).from(checklistExecutions).where(and(
    eq(checklistExecutions.checklistId, checklist.id), eq(checklistExecutions.branchId, parsed.data.branchId),
    eq(checklistExecutions.saleNumber, parsed.data.saleNumber), inArray(checklistExecutions.status, ["pending", "in_progress"]),
  )).limit(1);
  if (existing) return NextResponse.json({ error: "Já existe uma execução pendente deste checklist para a venda.", executionId: existing.id }, { status: 409 });
  const [startNode] = await db.select({ id: checklistFlowNodes.id }).from(checklistFlowNodes).where(and(eq(checklistFlowNodes.checklistId, checklist.id), eq(checklistFlowNodes.type, "start"))).limit(1);
  let currentNodeId: string | null = null;
  if (startNode) {
    const [firstEdge] = await db.select({ targetNodeId: checklistFlowEdges.targetNodeId }).from(checklistFlowEdges)
      .where(eq(checklistFlowEdges.sourceNodeId, startNode.id)).orderBy(checklistFlowEdges.priority).limit(1);
    if (!firstEdge) return NextResponse.json({ error: "O fluxo publicado não possui uma saída a partir do início." }, { status: 409 });
    currentNodeId = firstEdge.targetNodeId;
  }
  let execution;
  try {
    execution = await db.transaction(async (tx) => {
      const [created] = await tx.insert(checklistExecutions).values({
        checklistId: checklist.id, branchId: parsed.data.branchId, saleNumber: parsed.data.saleNumber,
        customerName: parsed.data.customerName || null, assignedTo: auth.user.id, createdBy: auth.user.id, currentNodeId,
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
