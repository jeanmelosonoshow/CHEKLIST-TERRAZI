import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { checklistFieldOptions, checklistFields, checklistFlowEdges, checklistFlowNodes, checklists } from "@/db/schema";
import { getApiPermission } from "@/lib/api-auth";

const idSchema = z.string().uuid();
const bodySchema = z.object({ mode: z.enum(["clone", "revision"]).default("clone") });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getApiPermission("editChecklist"); if ("error" in auth) return auth.error;
  const id = idSchema.safeParse((await context.params).id); if (!id.success) return NextResponse.json({ error: "Checklist inválido." }, { status: 400 });
  const body = bodySchema.safeParse(await request.json().catch(() => ({}))); if (!body.success) return NextResponse.json({ error: "Operação inválida." }, { status: 400 });
  const [source] = await db.select().from(checklists).where(eq(checklists.id, id.data)).limit(1);
  if (!source) return NextResponse.json({ error: "Checklist não encontrado." }, { status: 404 });
  if (body.data.mode === "revision" && source.status !== "published") return NextResponse.json({ error: "Somente um checklist publicado pode gerar uma revisão." }, { status: 409 });

  const cloned = await db.transaction(async (tx) => {
    if (body.data.mode === "revision") await tx.update(checklists).set({ status: "revoked", updatedAt: new Date() }).where(eq(checklists.id, source.id));
    const nextVersion = body.data.mode === "revision" ? source.version + 1 : 1;
    const [created] = await tx.insert(checklists).values({
      title: body.data.mode === "revision" ? `${source.title} — Revisão ${nextVersion}` : `${source.title} — Cópia`,
      description: source.description, status: "draft", sourceChecklistId: source.sourceChecklistId || source.id,
      version: nextVersion, createdBy: auth.user.id,
    }).returning();

    const fields = await tx.select().from(checklistFields).where(eq(checklistFields.checklistId, source.id)).orderBy(asc(checklistFields.position));
    for (const field of fields) {
      const [newField] = await tx.insert(checklistFields).values({ checklistId: created.id, label: field.label, description: field.description, type: field.type, required: field.required, position: field.position, sourceKey: field.sourceKey, configuration: field.configuration }).returning({ id: checklistFields.id });
      const options = await tx.select().from(checklistFieldOptions).where(eq(checklistFieldOptions.fieldId, field.id)).orderBy(asc(checklistFieldOptions.position));
      if (options.length) await tx.insert(checklistFieldOptions).values(options.map((option) => ({ fieldId: newField.id, value: option.value, label: option.label, position: option.position, active: option.active })));
    }

    const nodes = await tx.select().from(checklistFlowNodes).where(eq(checklistFlowNodes.checklistId, source.id)).orderBy(asc(checklistFlowNodes.position));
    if (nodes.length) {
      const inserted = await tx.insert(checklistFlowNodes).values(nodes.map((node) => ({ checklistId: created.id, nodeKey: node.nodeKey, type: node.type, title: node.title, description: node.description, fieldType: node.fieldType, required: node.required, sourceKey: node.sourceKey, automationSource: node.automationSource, querySql: node.querySql, resultField: node.resultField, autoIntervalMinutes: node.autoIntervalMinutes, customerResultField: node.customerResultField, productCodeField: node.productCodeField, productDescriptionField: node.productDescriptionField, productQuantityField: node.productQuantityField, outcome: node.outcome, position: node.position, configuration: node.configuration }))).returning({ id: checklistFlowNodes.id, nodeKey: checklistFlowNodes.nodeKey });
      const newIds = new Map(inserted.map((node) => [node.nodeKey, node.id])); const oldKeys = new Map(nodes.map((node) => [node.id, node.nodeKey]));
      const edges = await tx.select().from(checklistFlowEdges).where(eq(checklistFlowEdges.checklistId, source.id)).orderBy(asc(checklistFlowEdges.priority));
      if (edges.length) await tx.insert(checklistFlowEdges).values(edges.map((edge) => ({ checklistId: created.id, sourceNodeId: newIds.get(oldKeys.get(edge.sourceNodeId)!)!, targetNodeId: newIds.get(oldKeys.get(edge.targetNodeId)!)!, condition: edge.condition, conditionValue: edge.conditionValue, label: edge.label, sourcePort: edge.sourcePort, targetPort: edge.targetPort, priority: edge.priority })));
    }
    return created;
  });
  return NextResponse.json({ checklist: cloned }, { status: 201 });
}
