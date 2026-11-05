import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { checklistFields, checklists, syncedSources } from "@/db/schema";
import { getApiPermission } from "@/lib/api-auth";

const idSchema = z.string().uuid();

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getApiPermission("editChecklist");
  if ("error" in auth) return auth.error;
  const id = idSchema.safeParse((await context.params).id);
  if (!id.success) return NextResponse.json({ error: "Checklist inválido." }, { status: 400 });

  const fields = await db.select({ type: checklistFields.type, sourceKey: checklistFields.sourceKey })
    .from(checklistFields).where(eq(checklistFields.checklistId, id.data));
  if (!fields.length) return NextResponse.json({ error: "Inclua pelo menos uma pergunta antes de publicar." }, { status: 409 });
  const selectionFields = fields.filter((field) => field.type === "single_select" || field.type === "multi_select");
  if (selectionFields.some((field) => !field.sourceKey)) {
    return NextResponse.json({ error: "Toda pergunta de seleção deve possuir uma fonte de opções." }, { status: 409 });
  }
  const sourceKeys = Array.from(new Set(selectionFields.flatMap((field) => field.sourceKey ? [field.sourceKey] : [])));
  if (sourceKeys.length) {
    const activeSources = await db.select({ key: syncedSources.key }).from(syncedSources)
      .where(and(inArray(syncedSources.key, sourceKeys), eq(syncedSources.active, true)));
    if (activeSources.length !== sourceKeys.length) return NextResponse.json({ error: "Uma ou mais fontes de seleção estão inativas ou não existem." }, { status: 409 });
  }
  const [published] = await db.update(checklists).set({ status: "published", updatedAt: new Date() })
    .where(and(eq(checklists.id, id.data), eq(checklists.status, "draft"))).returning();
  if (!published) return NextResponse.json({ error: "Checklist não encontrado ou já publicado." }, { status: 409 });
  return NextResponse.json({ checklist: published });
}
