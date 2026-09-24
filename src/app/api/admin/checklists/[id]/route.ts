import { and, asc, eq } from "drizzle-orm";
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
  const fields = await db.select({ label: checklistFields.label, type: checklistFields.type, required: checklistFields.required, sourceKey: checklistFields.sourceKey }).from(checklistFields).where(eq(checklistFields.checklistId, checklist.id)).orderBy(asc(checklistFields.position));
  return NextResponse.json({ checklist: { title: checklist.title, description: checklist.description, fields } });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getApiPermission("editChecklist");
  if ("error" in auth) return auth.error;
  const parsedId = idSchema.safeParse((await context.params).id);
  if (!parsedId.success) return NextResponse.json({ error: "Checklist inválido." }, { status: 400 });
  const parsed = updateChecklistSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revise os dados do checklist.", details: parsed.error.flatten() }, { status: 400 });

  const updated = await db.transaction(async (tx) => {
    const [checklist] = await tx.update(checklists).set({ title: parsed.data.title, description: parsed.data.description || null, updatedAt: new Date() }).where(and(eq(checklists.id, parsedId.data), eq(checklists.status, "draft"))).returning({ id: checklists.id });
    if (!checklist) return null;
    await tx.delete(checklistFields).where(eq(checklistFields.checklistId, checklist.id));
    await tx.insert(checklistFields).values(parsed.data.fields.map((field, position) => ({ checklistId: checklist.id, label: field.label, type: field.type, required: field.required, sourceKey: field.sourceKey || null, position })));
    return checklist;
  });

  if (!updated) return NextResponse.json({ error: "Checklist não encontrado ou não está mais em rascunho." }, { status: 409 });
  return NextResponse.json({ checklist: updated });
}
