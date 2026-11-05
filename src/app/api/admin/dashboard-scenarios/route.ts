import { NextResponse } from "next/server";
import { db } from "@/db";
import { dashboardScenarioHistory, dashboardScenarios } from "@/db/schema";
import { getApiAdmin } from "@/lib/api-auth";
import { scenarioConfiguration } from "@/lib/dashboard-scenarios";
import { validateDashboardQuery } from "@/lib/dashboard-query";
import { dashboardScenarioSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const auth = await getApiAdmin();
  if ("error" in auth) return auth.error;
  const parsed = dashboardScenarioSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revise a configuração do cenário.", details: parsed.error.flatten() }, { status: 400 });

  const summaryValidation = validateDashboardQuery(parsed.data.summarySql);
  if (!summaryValidation.valid) return NextResponse.json({ error: summaryValidation.error }, { status: 400 });
  const detailValidation = parsed.data.detailSql ? validateDashboardQuery(parsed.data.detailSql) : null;
  if (detailValidation && !detailValidation.valid) return NextResponse.json({ error: `Consulta de detalhe: ${detailValidation.error}` }, { status: 400 });

  const scenario = await db.transaction(async (tx) => {
    const [created] = await tx.insert(dashboardScenarios).values({
      title: parsed.data.title,
      description: parsed.data.description || null,
      visualization: parsed.data.visualization,
      summarySql: summaryValidation.sql,
      detailSql: detailValidation?.sql || null,
      labelField: parsed.data.labelField || null,
      valueField: parsed.data.valueField,
      labelFormat: parsed.data.labelFormat,
      valueFormat: parsed.data.valueFormat,
      color: parsed.data.color,
      position: parsed.data.position,
      active: parsed.data.active,
      createdBy: auth.user.id,
      updatedBy: auth.user.id,
    }).returning();
    await tx.insert(dashboardScenarioHistory).values({
      scenarioId: created.id,
      version: created.version,
      configuration: scenarioConfiguration(created),
      changedBy: auth.user.id,
    });
    return created;
  });

  return NextResponse.json({ scenario }, { status: 201 });
}
