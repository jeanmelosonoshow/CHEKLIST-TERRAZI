import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { checklistExecutionEvents, checklistExecutions, checklistFlowItemResponses, checklistFlowNodes } from "@/db/schema";
import { getApiPermission } from "@/lib/api-auth";
import { isAdministrator } from "@/lib/permissions";
import { prepareItemizedAnswers } from "@/lib/itemized-checklist";

const idSchema = z.string().uuid();
const bodySchema = z.object({ nodeId: z.string().uuid(), answer: z.unknown().optional(), observation: z.string().max(5000).nullish(), itemAnswers: z.array(z.object({ itemIndex: z.number().int().min(0), success: z.boolean(), observation: z.string().max(2000).nullish() })).max(1000).optional() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getApiPermission("viewChecklist"); if ("error" in auth) return auth.error;
  const id = idSchema.safeParse((await context.params).id); const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !body.success) return NextResponse.json({ error: "Rascunho inválido." }, { status: 400 });
  const [execution] = await db.select().from(checklistExecutions).where(eq(checklistExecutions.id, id.data)).limit(1);
  if (!execution) return NextResponse.json({ error: "Execução não encontrada." }, { status: 404 });
  if (!isAdministrator(auth.user) && execution.assignedTo !== auth.user.id) return NextResponse.json({ error: "Sem acesso a esta execução." }, { status: 403 });
  if (execution.status === "completed" || execution.status === "cancelled" || execution.currentNodeId !== body.data.nodeId) return NextResponse.json({ error: "A etapa atual foi alterada ou encerrada." }, { status: 409 });
  const [node] = await db.select({ id: checklistFlowNodes.id, responseByItem: checklistFlowNodes.responseByItem }).from(checklistFlowNodes).where(and(eq(checklistFlowNodes.id, body.data.nodeId), eq(checklistFlowNodes.checklistId, execution.checklistId))).limit(1);
  if (!node) return NextResponse.json({ error: "Etapa não encontrada." }, { status: 404 });
  const prepared = node.responseByItem ? prepareItemizedAnswers(execution.saleItems, body.data.itemAnswers || [], false) : { answers: [] };
  if ("error" in prepared && prepared.error) return NextResponse.json({ error: prepared.error }, { status: 409 });
  const now = new Date();
  await db.transaction(async (tx) => {
    for (const item of prepared.answers) {
      await tx.insert(checklistFlowItemResponses).values({ executionId: execution.id, nodeId: node.id, itemIndex: item.itemIndex, productCode: item.productCode, productDescription: item.productDescription, quantity: item.quantity, success: item.success, observation: item.observation, userId: auth.user.id, updatedAt: now })
        .onConflictDoUpdate({ target: [checklistFlowItemResponses.executionId, checklistFlowItemResponses.nodeId, checklistFlowItemResponses.itemIndex], set: { success: item.success, observation: item.observation, userId: auth.user.id, updatedAt: now } });
    }
    await tx.update(checklistExecutions).set({
      draftAnswer: body.data.answer === undefined ? null : body.data.answer,
      draftObservation: body.data.observation || null,
      status: "in_progress",
      startedAt: execution.startedAt ?? now,
      updatedAt: now,
    }).where(eq(checklistExecutions.id, execution.id));
    await tx.insert(checklistExecutionEvents).values({ executionId: execution.id, event: "draft_saved", userId: auth.user.id, data: { nodeId: node.id } });
  });
  return NextResponse.json({ saved: true });
}
