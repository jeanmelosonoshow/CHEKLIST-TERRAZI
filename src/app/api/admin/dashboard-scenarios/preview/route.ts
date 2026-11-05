import { NextResponse } from "next/server";
import { getApiAdmin } from "@/lib/api-auth";
import { executeDashboardQuery } from "@/lib/dashboard-query";
import { rateLimit } from "@/lib/rate-limit";
import { dashboardScenarioPreviewSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await getApiAdmin();
  if ("error" in auth) return auth.error;
  const limit = await rateLimit("dashboard", auth.user.id);
  if (!limit.success) return NextResponse.json({ error: "Muitas consultas em sequência. Aguarde um minuto." }, { status: 429 });
  const parsed = dashboardScenarioPreviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Informe uma consulta válida." }, { status: 400 });
  try {
    const result = await executeDashboardQuery(parsed.data.sql, {
      branchId: auth.user.branchId,
      employeeId: auth.user.employeeId,
      category: auth.user.category,
    }, 10);
    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof Error && "status" in error ? Number(error.status) || 500 : 500;
    return NextResponse.json({ error: status >= 500 ? "Não foi possível consultar o SonoShowGateway." : (error as Error).message }, { status });
  }
}
