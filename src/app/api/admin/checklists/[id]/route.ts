import { and, asc, eq, notInArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { checklistFields, checklists } from "@/db/schema";
import { getApiPermission } from "@/lib/api-auth";
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
  return NextResponse.json({ checklist: { code: checklist.code, title: checklist.title, description: checklist.description, fields } });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getApiPermission("editChecklist");
  if ("error" in auth) return auth.error;
  const parsedId = idSchema.safeParse((await context.params).id);
  if (!parsedId.success) return NextResponse.json({ error: "Checklist inválido." }, { status: 400 });
  const parsed = updateChecklistSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revise os dados do checklist.", details: parsed.error.flatten() }, { status: 400 });
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
    return checklist;
  }).catch((error) => {
    if (error instanceof Error && error.message === "INVALID_CHECKLIST_FIELD") return "invalid-field" as const;
    throw error;
  });

  if (!updated) return NextResponse.json({ error: "Checklist não encontrado ou não está mais em rascunho." }, { status: 409 });
  if (updated === "invalid-field") return NextResponse.json({ error: "Um dos campos não pertence a este checklist." }, { status: 400 });
  return NextResponse.json({ checklist: updated });
}
