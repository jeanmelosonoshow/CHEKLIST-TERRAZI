import { NextResponse } from "next/server";
import { db } from "@/db";
import { checklistFields, checklists } from "@/db/schema";
import { getApiAdmin } from "@/lib/api-auth";
import { createChecklistSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const auth = await getApiAdmin();
  if ("error" in auth) return auth.error;
  const parsed = createChecklistSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revise os dados do checklist.", details: parsed.error.flatten() }, { status: 400 });

  const checklist = await db.transaction(async (tx) => {
    const [created] = await tx.insert(checklists).values({
      title: parsed.data.title,
      description: parsed.data.description || null,
      createdBy: auth.user.id,
    }).returning();
    await tx.insert(checklistFields).values(parsed.data.fields.map((field, position) => ({
      checklistId: created.id,
      label: field.label,
      type: field.type,
      required: field.required,
      sourceKey: field.sourceKey || null,
      position,
    })));
    return created;
  });
  return NextResponse.json({ checklist }, { status: 201 });
}
