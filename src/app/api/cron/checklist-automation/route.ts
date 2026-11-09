import { and, asc, eq, inArray, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { checklistExecutionEvents, checklistExecutions, checklistFlowEdges, checklistFlowNodes, checklistFlowSteps, users } from "@/db/schema";
import { selectNextEdge } from "@/lib/checklist-flow";
import { executeFlowAutomation } from "@/lib/flow-automation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Agendamento não autorizado." }, { status: 401 });
  const now = new Date();
  const candidates = await db.select({ execution: checklistExecutions, node: checklistFlowNodes, user: users })
    .from(checklistExecutions)
    .innerJoin(checklistFlowNodes, eq(checklistExecutions.currentNodeId, checklistFlowNodes.id))
    .innerJoin(users, eq(checklistExecutions.assignedTo, users.id))
    .where(and(
      inArray(checklistExecutions.status, ["pending", "in_progress"]),
      eq(checklistFlowNodes.type, "automatic_decision"),
      lte(checklistExecutions.nextAutomationAt, now),
    ))
    .orderBy(asc(checklistExecutions.nextAutomationAt))
    .limit(25);

  let advanced = 0; let waiting = 0; let failed = 0; let skipped = 0;
  for (const candidate of candidates) {
    const { execution, node, user } = candidate;
    if (!node.autoIntervalMinutes) { skipped += 1; continue; }
    const nextCheck = new Date(now.getTime() + node.autoIntervalMinutes * 60_000);
    const [claimed] = await db.update(checklistExecutions).set({ nextAutomationAt: nextCheck, lastAutomationAt: now })
      .where(and(eq(checklistExecutions.id, execution.id), eq(checklistExecutions.currentNodeId, node.id), lte(checklistExecutions.nextAutomationAt, now)))
      .returning({ id: checklistExecutions.id });
    if (!claimed) { skipped += 1; continue; }

    try {
      const answer = (await executeFlowAutomation(node, execution, user)).value;
      const edges = await db.select().from(checklistFlowEdges).where(eq(checklistFlowEdges.sourceNodeId, node.id)).orderBy(asc(checklistFlowEdges.priority));
      const edge = selectNextEdge(edges.map((item) => ({ sourceKey: node.nodeKey, targetKey: item.targetNodeId, condition: item.condition, conditionValue: item.conditionValue, label: item.label, priority: item.priority })), answer);
      if (!edge) { waiting += 1; continue; }
      const [target] = await db.select().from(checklistFlowNodes).where(eq(checklistFlowNodes.id, edge.targetKey)).limit(1);
      if (!target) throw new Error("O próximo bloco configurado não foi encontrado.");
      const completed = target.type === "end";
      const moved = await db.transaction(async (tx) => {
        const [updated] = await tx.update(checklistExecutions).set({
          currentNodeId: target.id,
          status: completed ? "completed" : "in_progress",
          outcome: completed ? target.outcome : null,
          draftAnswer: null,
          draftObservation: null,
          nextAutomationAt: !completed && target.type === "automatic_decision" && target.autoIntervalMinutes ? now : null,
          startedAt: execution.startedAt ?? now,
          completedAt: completed ? now : null,
          updatedAt: now,
        }).where(and(eq(checklistExecutions.id, execution.id), eq(checklistExecutions.currentNodeId, node.id))).returning({ id: checklistExecutions.id });
        if (!updated) return false;
        await tx.insert(checklistFlowSteps).values({ executionId: execution.id, nodeId: node.id, answer, automatic: true, nextNodeId: target.id, userId: user.id });
        await tx.insert(checklistExecutionEvents).values({ executionId: execution.id, event: completed ? `completed_${target.outcome}` : "automatic_step_completed", userId: user.id, data: { nodeId: node.id, nextNodeId: target.id } });
        return true;
      });
      if (moved) advanced += 1; else skipped += 1;
    } catch (error) {
      failed += 1;
      await db.insert(checklistExecutionEvents).values({ executionId: execution.id, event: "automatic_check_failed", userId: user.id, data: { nodeId: node.id, message: error instanceof Error ? error.message.slice(0, 500) : "Falha não identificada" } });
    }
  }
  return NextResponse.json({ checked: candidates.length, advanced, waiting, failed, skipped, processedAt: now.toISOString() });
}
