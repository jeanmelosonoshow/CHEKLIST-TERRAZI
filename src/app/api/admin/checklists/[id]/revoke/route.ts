import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { checklists } from "@/db/schema";
import { getApiPermission } from "@/lib/api-auth";

const idSchema = z.string().uuid();

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getApiPermission("editChecklist");
  if ("error" in auth) return auth.error;
  const id = idSchema.safeParse((await context.params).id);
  if (!id.success) return NextResponse.json({ error: "Checklist inválido." }, { status: 400 });
  const [checklist] = await db.select({ status: checklists.status }).from(checklists).where(eq(checklists.id, id.data)).limit(1);
  if (!checklist) return NextResponse.json({ error: "Checklist não encontrado." }, { status: 404 });
  if (checklist.status !== "published") return NextResponse.json({ error: "Somente checklists publicados podem ser revogados." }, { status: 409 });
  await db.update(checklists).set({ status: "archived", updatedAt: new Date() }).where(eq(checklists.id, id.data));
  return NextResponse.json({ status: "archived" });
}
