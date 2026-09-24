import { NextResponse } from "next/server";
import { db } from "@/db";
import { categoryPermissions } from "@/db/schema";
import { getApiAdmin } from "@/lib/api-auth";
import { updateCategoryPermissionsSchema } from "@/lib/validation";

export async function PUT(request: Request) {
  const auth = await getApiAdmin();
  if ("error" in auth) return auth.error;
  const parsed = updateCategoryPermissionsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revise a categoria e as permissões.", details: parsed.error.flatten() }, { status: 400 });

  const values = { ...parsed.data, updatedAt: new Date() };
  const [permissions] = await db.insert(categoryPermissions).values(values).onConflictDoUpdate({
    target: categoryPermissions.category,
    set: {
      viewChecklist: values.viewChecklist,
      createChecklist: values.createChecklist,
      editChecklist: values.editChecklist,
      reports: values.reports,
      dashboard: values.dashboard,
      updatedAt: values.updatedAt,
    },
  }).returning();
  return NextResponse.json({ permissions });
}
