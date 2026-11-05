import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { syncedSources } from "@/db/schema";
import { getApiAdmin } from "@/lib/api-auth";
import { validateDashboardQuery } from "@/lib/dashboard-query";
import { optionSourceSchema } from "@/lib/validation";

export async function PUT(request: Request, context: { params: Promise<{ key: string }> }) {
  const auth = await getApiAdmin();
  if ("error" in auth) return auth.error;
  const key = (await context.params).key;
  const parsed = optionSourceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.key !== key) return NextResponse.json({ error: "Revise a configuração da fonte." }, { status: 400 });
  if (parsed.data.querySql) {
    const validation = validateDashboardQuery(parsed.data.querySql);
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const [current] = await db.select({ sourceType: syncedSources.sourceType }).from(syncedSources).where(eq(syncedSources.key, key)).limit(1);
  if (!current) return NextResponse.json({ error: "Fonte não encontrada." }, { status: 404 });
  if (current.sourceType === "synchronized") return NextResponse.json({ error: "Fontes sincronizadas são administradas pela API de sincronização." }, { status: 409 });
  const [source] = await db.update(syncedSources).set({
    label: parsed.data.label,
    description: parsed.data.description || null,
    sourceType: parsed.data.sourceType,
    querySql: parsed.data.querySql || null,
    resultValueField: parsed.data.resultValueField,
    resultLabelField: parsed.data.resultLabelField,
    staticOptions: parsed.data.staticOptions,
    active: parsed.data.active,
    updatedAt: new Date(),
  }).where(eq(syncedSources.key, key)).returning();
  return NextResponse.json({ source });
}
