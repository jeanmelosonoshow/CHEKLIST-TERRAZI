import { NextResponse } from "next/server";
import { db } from "@/db";
import { checklistFields, checklistFlowEdges, checklistFlowNodes, checklists } from "@/db/schema";
import { getApiPermission } from "@/lib/api-auth";
import { validateFlowDefinition } from "@/lib/checklist-flow";
import { validateDashboardQuery } from "@/lib/dashboard-query";
import { createChecklistSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const auth = await getApiPermission("createChecklist");
  if ("error" in auth) return auth.error;
  const parsed = createChecklistSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revise os dados do checklist.", details: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.flow) {
    const errors = validateFlowDefinition(parsed.data.flow);
    if (errors.length) return NextResponse.json({ error: errors[0], details: errors }, { status: 400 });
    for (const node of parsed.data.flow.nodes.filter((item) => item.type === "automatic_decision" || (item.type === "start" && item.automationSource))) {
      const validation = validateDashboardQuery(node.querySql || "");
      if (!validation.valid) return NextResponse.json({ error: `${node.title}: ${validation.error}` }, { status: 400 });
    }
  }

  const checklist = await db.transaction(async (tx) => {
    const [created] = await tx.insert(checklists).values({
      title: parsed.data.title,
      description: parsed.data.description || null,
      createdBy: auth.user.id,
    }).returning();
    if (parsed.data.fields.length) await tx.insert(checklistFields).values(parsed.data.fields.map((field, position) => ({ checklistId: created.id, label: field.label, type: field.type, required: field.required, sourceKey: field.sourceKey || null, position })));
    if (parsed.data.flow) {
      const inserted = await tx.insert(checklistFlowNodes).values(parsed.data.flow.nodes.map((node) => ({
        checklistId: created.id, nodeKey: node.nodeKey, type: node.type, title: node.title, description: node.description || null,
        fieldType: node.fieldType || null, required: node.required, responseByItem: node.type === "action" && Boolean(node.responseByItem), sourceKey: node.sourceKey || null,
        automationSource: node.automationSource || null, querySql: node.querySql || null, resultField: node.resultField,
        autoIntervalMinutes: node.type === "automatic_decision" ? node.autoIntervalMinutes || null : null,
        customerResultField: node.customerResultField || null,
        productCodeField: node.productCodeField || null, productDescriptionField: node.productDescriptionField || null, productQuantityField: node.productQuantityField || null,
        configuration: { x: node.x, y: node.y },
        outcome: node.outcome || null, position: node.position,
      }))).returning({ id: checklistFlowNodes.id, nodeKey: checklistFlowNodes.nodeKey });
      const ids = new Map(inserted.map((node) => [node.nodeKey, node.id]));
      await tx.insert(checklistFlowEdges).values(parsed.data.flow.edges.map((edge) => ({
        checklistId: created.id, sourceNodeId: ids.get(edge.sourceKey)!, targetNodeId: ids.get(edge.targetKey)!,
        condition: edge.condition, conditionValue: edge.conditionValue, label: edge.label || null,
        sourcePort: edge.sourcePort || "right", targetPort: edge.targetPort || "left", priority: edge.priority,
      })));
    }
    return created;
  });
  return NextResponse.json({ checklist }, { status: 201 });
}
