import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { dashboardScenarios } from "@/db/schema";
import { getApiPermission } from "@/lib/api-auth";
import { executeDashboardQuery } from "@/lib/dashboard-query";
import { rateLimit } from "@/lib/rate-limit";

const idSchema = z.string().uuid();

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getApiPermission("dashboard");
  if ("error" in auth) return auth.error;
  const limit = await rateLimit("dashboard", auth.user.id);
  if (!limit.success) return NextResponse.json({ error: "Muitas consultas em sequência. Aguarde um minuto." }, { status: 429 });
  const id = idSchema.safeParse((await context.params).id);
  if (!id.success) return NextResponse.json({ error: "Cenário inválido." }, { status: 400 });
  const [scenario] = await db.select().from(dashboardScenarios).where(eq(dashboardScenarios.id, id.data)).limit(1);
  if (!scenario || !scenario.active) return NextResponse.json({ error: "Cenário não encontrado." }, { status: 404 });

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") === "detail" ? "detail" : "summary";
  const sql = mode === "detail" ? scenario.detailSql : scenario.summarySql;
  if (!sql) return NextResponse.json({ error: "Este cenário não possui consulta de detalhe." }, { status: 404 });
  try {
    const result = await executeDashboardQuery(sql, {
      branchId: auth.user.branchId,
      employeeId: auth.user.employeeId,
      category: auth.user.category,
      detailValue: url.searchParams.get("value")?.slice(0, 500),
      detailField: url.searchParams.get("field")?.slice(0, 120),
      detailSeries: url.searchParams.get("series")?.slice(0, 200),
    }, mode === "detail" ? 500 : 100);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Falha ao executar cenário do dashboard:", error);
    const status = error instanceof Error && "status" in error ? Number(error.status) || 500 : 500;
    return NextResponse.json({ error: status >= 500 ? "Não foi possível carregar os dados do cenário." : (error as Error).message }, { status });
  }
}
