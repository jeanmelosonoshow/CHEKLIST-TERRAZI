import { NextResponse } from "next/server";
import { db } from "@/db";
import { reportDefinitions } from "@/db/schema";
import { getApiAdmin } from "@/lib/api-auth";
import { validateDashboardQuery } from "@/lib/dashboard-query";
import { reportDefinitionSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const auth = await getApiAdmin(); if ("error" in auth) return auth.error;
  const parsed = reportDefinitionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Revise o relatório." }, { status: 400 });
  for (const query of [parsed.data.primarySql, parsed.data.secondarySql].filter(Boolean) as string[]) { const validation = validateDashboardQuery(query); if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 }); }
  const [report] = await db.insert(reportDefinitions).values({ ...parsed.data, description: parsed.data.description || null, secondarySql: parsed.data.secondarySql || null, createdBy: auth.user.id, updatedBy: auth.user.id }).returning();
  return NextResponse.json({ report }, { status: 201 });
}
