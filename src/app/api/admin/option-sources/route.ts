import { NextResponse } from "next/server";
import { db } from "@/db";
import { syncedSources } from "@/db/schema";
import { getApiAdmin } from "@/lib/api-auth";
import { validateDashboardQuery } from "@/lib/dashboard-query";
import { optionSourceSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const auth = await getApiAdmin();
  if ("error" in auth) return auth.error;
  const parsed = optionSourceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revise a configuração da fonte.", details: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.querySql) {
    const validation = validateDashboardQuery(parsed.data.querySql);
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  try {
    const [source] = await db.insert(syncedSources).values({
      key: parsed.data.key,
      label: parsed.data.label,
      description: parsed.data.description || null,
      sourceType: parsed.data.sourceType,
      querySql: parsed.data.querySql || null,
      resultValueField: parsed.data.resultValueField,
      resultLabelField: parsed.data.resultLabelField,
      staticOptions: parsed.data.staticOptions,
      active: parsed.data.active,
    }).returning();
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "23505") return NextResponse.json({ error: "Já existe uma fonte com esta chave." }, { status: 409 });
    throw error;
  }
}
