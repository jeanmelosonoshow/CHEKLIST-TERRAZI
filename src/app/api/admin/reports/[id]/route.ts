import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { reportDefinitions } from "@/db/schema";
import { getApiAdmin } from "@/lib/api-auth";
import { validateDashboardQuery } from "@/lib/dashboard-query";
import { reportDefinitionSchema } from "@/lib/validation";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getApiAdmin(); if ("error" in auth) return auth.error;
  const id = z.string().uuid().safeParse((await context.params).id); const parsed = reportDefinitionSchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !parsed.success) return NextResponse.json({ error: parsed.success ? "Relatório inválido." : parsed.error.issues[0]?.message || "Revise o relatório." }, { status: 400 });
  for (const query of [parsed.data.primarySql, parsed.data.secondarySql].filter(Boolean) as string[]) { const validation = validateDashboardQuery(query); if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 }); }
  const [report] = await db.update(reportDefinitions).set({ ...parsed.data, description: parsed.data.description || null, secondarySql: parsed.data.secondarySql || null, updatedBy: auth.user.id, updatedAt: new Date() }).where(eq(reportDefinitions.id, id.data)).returning();
  if (!report) return NextResponse.json({ error: "Relatório não encontrado." }, { status: 404 });
  return NextResponse.json({ report });
}
