import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { dashboardScenarioHistory, dashboardScenarios } from "@/db/schema";
import { getApiAdmin } from "@/lib/api-auth";
import { scenarioConfiguration } from "@/lib/dashboard-scenarios";
import { validateDashboardQuery } from "@/lib/dashboard-query";
import { dashboardScenarioSchema } from "@/lib/validation";

const idSchema = z.string().uuid();

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getApiAdmin();
  if ("error" in auth) return auth.error;
  const id = idSchema.safeParse((await context.params).id);
  if (!id.success) return NextResponse.json({ error: "Cenário inválido." }, { status: 400 });
  const parsed = dashboardScenarioSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revise a configuração do cenário.", details: parsed.error.flatten() }, { status: 400 });
  const summaryValidation = validateDashboardQuery(parsed.data.summarySql);
  if (!summaryValidation.valid) return NextResponse.json({ error: summaryValidation.error }, { status: 400 });
  const detailValidation = parsed.data.detailSql ? validateDashboardQuery(parsed.data.detailSql) : null;
  if (detailValidation && !detailValidation.valid) return NextResponse.json({ error: `Consulta de detalhe: ${detailValidation.error}` }, { status: 400 });

  const updated = await db.transaction(async (tx) => {
    const [scenario] = await tx.update(dashboardScenarios).set({
      title: parsed.data.title,
      description: parsed.data.description || null,
      visualization: parsed.data.visualization,
      summarySql: summaryValidation.sql,
      detailSql: detailValidation?.sql || null,
      labelField: parsed.data.labelField || null,
      valueField: parsed.data.valueField,
      labelFormat: parsed.data.labelFormat,
      valueFormat: parsed.data.valueFormat,
      columnFormats: parsed.data.columnFormats,
      color: parsed.data.color,
      position: parsed.data.position,
      active: parsed.data.active,
      version: parsed.data.version + 1,
      updatedBy: auth.user.id,
      updatedAt: new Date(),
    }).where(and(eq(dashboardScenarios.id, id.data), eq(dashboardScenarios.version, parsed.data.version))).returning();
    if (!scenario) return null;
    await tx.insert(dashboardScenarioHistory).values({
      scenarioId: scenario.id,
      version: scenario.version,
      configuration: scenarioConfiguration(scenario),
      changedBy: auth.user.id,
    });
    return scenario;
  });

  if (!updated) return NextResponse.json({ error: "O cenário foi alterado por outro usuário. Recarregue a página." }, { status: 409 });
  return NextResponse.json({ scenario: updated });
}
