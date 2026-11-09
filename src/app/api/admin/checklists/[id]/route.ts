import { and, asc, eq, notInArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { checklistFields, checklistFlowEdges, checklistFlowNodes, checklists } from "@/db/schema";
import { getApiPermission } from "@/lib/api-auth";
import { validateFlowDefinition } from "@/lib/checklist-flow";
import { validateDashboardQuery } from "@/lib/dashboard-query";
import { updateChecklistSchema } from "@/lib/validation";

const idSchema = z.string().uuid();

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getApiPermission("editChecklist");
  if ("error" in auth) return auth.error;
  const parsedId = idSchema.safeParse((await context.params).id);
  if (!parsedId.success) return NextResponse.json({ error: "Checklist inválido." }, { status: 400 });

  const [checklist] = await db.select().from(checklists).where(eq(checklists.id, parsedId.data)).limit(1);
  if (!checklist) return NextResponse.json({ error: "Checklist não encontrado." }, { status: 404 });
  if (checklist.status !== "draft") return NextResponse.json({ error: "Somente checklists em rascunho podem ser editados." }, { status: 409 });
  const fields = await db.select({ id: checklistFields.id, code: checklistFields.code, label: checklistFields.label, type: checklistFields.type, required: checklistFields.required, sourceKey: checklistFields.sourceKey }).from(checklistFields).where(eq(checklistFields.checklistId, checklist.id)).orderBy(asc(checklistFields.position));
  const storedNodes = await db.select().from(checklistFlowNodes).where(eq(checklistFlowNodes.checklistId, checklist.id)).orderBy(asc(checklistFlowNodes.position));
  const nodes = storedNodes.map((node) => ({ ...node, x: typeof node.configuration.x === "number" ? node.configuration.x : undefined, y: typeof node.configuration.y === "number" ? node.configuration.y : undefined }));
  const edges = nodes.length ? await db.select().from(checklistFlowEdges).where(eq(checklistFlowEdges.checklistId, checklist.id)).orderBy(asc(checklistFlowEdges.priority)) : [];
  const keys = new Map(nodes.map((node) => [node.id, node.nodeKey]));
  const flow = nodes.length ? { nodes, edges: edges.map((edge) => ({ ...edge, sourceKey: keys.get(edge.sourceNodeId), targetKey: keys.get(edge.targetNodeId) })) } : null;
  return NextResponse.json({ checklist: { code: checklist.code, title: checklist.title, description: checklist.description, fields, flow } });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getApiPermission("editChecklist");
  if ("error" in auth) return auth.error;
  const parsedId = idSchema.safeParse((await context.params).id);
  if (!parsedId.success) return NextResponse.json({ error: "Checklist inválido." }, { status: 400 });
  const parsed = updateChecklistSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revise os dados do checklist.", details: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.flow) {
    const errors = validateFlowDefinition(parsed.data.flow);
    if (errors.length) return NextResponse.json({ error: errors[0], details: errors }, { status: 400 });
    for (const node of parsed.data.flow.nodes.filter((item) => item.type === "automatic_decision" || (item.type === "start" && item.automationSource))) {
      const validation = validateDashboardQuery(node.querySql || "");
      if (!validation.valid) return NextResponse.json({ error: `${node.title}: ${validation.error}` }, { status: 400 });
    }
  }
  const retainedIds = parsed.data.fields.flatMap((field) => field.id ? [field.id] : []);
  if (new Set(retainedIds).size !== retainedIds.length) return NextResponse.json({ error: "Existem campos duplicados no checklist." }, { status: 400 });

  const updated = await db.transaction(async (tx) => {
    const [checklist] = await tx.update(checklists).set({ title: parsed.data.title, description: parsed.data.description || null, updatedAt: new Date() }).where(and(eq(checklists.id, parsedId.data), eq(checklists.status, "draft"))).returning({ id: checklists.id });
    if (!checklist) return null;
    const existingFields = await tx.select({ id: checklistFields.id }).from(checklistFields).where(eq(checklistFields.checklistId, checklist.id));
    const existingIds = new Set(existingFields.map((field) => field.id));
    if (retainedIds.some((id) => !existingIds.has(id))) throw new Error("INVALID_CHECKLIST_FIELD");

    if (retainedIds.length) {
      await tx.delete(checklistFields).where(and(eq(checklistFields.checklistId, checklist.id), notInArray(checklistFields.id, retainedIds)));
    } else {
      await tx.delete(checklistFields).where(eq(checklistFields.checklistId, checklist.id));
    }

    const newFields = [];
    for (const [position, field] of parsed.data.fields.entries()) {
      const values = { label: field.label, type: field.type, required: field.required, sourceKey: field.sourceKey || null, position };
      if (field.id) {
        await tx.update(checklistFields).set(values).where(and(eq(checklistFields.id, field.id), eq(checklistFields.checklistId, checklist.id)));
      } else {
        newFields.push({ checklistId: checklist.id, ...values });
      }
    }
    if (newFields.length) await tx.insert(checklistFields).values(newFields);
    if (parsed.data.flow) {
      await tx.delete(checklistFlowNodes).where(eq(checklistFlowNodes.checklistId, checklist.id));
      const inserted = await tx.insert(checklistFlowNodes).values(parsed.data.flow.nodes.map((node) => ({
        checklistId: checklist.id, nodeKey: node.nodeKey, type: node.type, title: node.title, description: node.description || null,
        fieldType: node.fieldType || null, required: node.required, sourceKey: node.sourceKey || null,
        automationSource: node.automationSource || null, querySql: node.querySql || null, resultField: node.resultField,
        autoIntervalMinutes: node.type === "automatic_decision" ? node.autoIntervalMinutes || null : null,
        customerResultField: node.customerResultField || null,
        productCodeField: node.productCodeField || null, productDescriptionField: node.productDescriptionField || null, productQuantityField: node.productQuantityField || null,
        configuration: { x: node.x, y: node.y },
        outcome: node.outcome || null, position: node.position,
      }))).returning({ id: checklistFlowNodes.id, nodeKey: checklistFlowNodes.nodeKey });
      const ids = new Map(inserted.map((node) => [node.nodeKey, node.id]));
      await tx.insert(checklistFlowEdges).values(parsed.data.flow.edges.map((edge) => ({
        checklistId: checklist.id, sourceNodeId: ids.get(edge.sourceKey)!, targetNodeId: ids.get(edge.targetKey)!,
        condition: edge.condition, conditionValue: edge.conditionValue, label: edge.label || null,
        sourcePort: edge.sourcePort || "right", targetPort: edge.targetPort || "left", priority: edge.priority,
      })));
    }
    return checklist;
  }).catch((error) => {
    if (error instanceof Error && error.message === "INVALID_CHECKLIST_FIELD") return "invalid-field" as const;
    throw error;
  });

  if (!updated) return NextResponse.json({ error: "Checklist não encontrado ou não está mais em rascunho." }, { status: 409 });
  if (updated === "invalid-field") return NextResponse.json({ error: "Um dos campos não pertence a este checklist." }, { status: 400 });
  return NextResponse.json({ checklist: updated });
}
