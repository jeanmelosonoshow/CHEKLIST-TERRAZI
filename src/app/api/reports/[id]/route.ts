import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { reportDefinitions } from "@/db/schema";
import { getApiPermission } from "@/lib/api-auth";
import { executeReport } from "@/lib/reports";

export const runtime = "nodejs"; export const maxDuration = 60;
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getApiPermission("reports"); if ("error" in auth) return auth.error;
  const id = z.string().uuid().safeParse((await context.params).id); if (!id.success) return NextResponse.json({ error: "Relatório inválido." }, { status: 400 });
  const [report] = await db.select().from(reportDefinitions).where(eq(reportDefinitions.id, id.data)).limit(1); if (!report || !report.active) return NextResponse.json({ error: "Relatório não encontrado." }, { status: 404 });
  const url = new URL(request.url);
  try { return NextResponse.json(await executeReport(report, { branchId: url.searchParams.get("branch") || auth.user.branchId, employeeId: auth.user.employeeId, category: auth.user.category, saleNumber: url.searchParams.get("sale") || undefined, customer: url.searchParams.get("customer") || undefined, dateFrom: url.searchParams.get("from") || undefined, dateTo: url.searchParams.get("to") || undefined }, 2000)); }
  catch (error) { const status = error instanceof Error && "status" in error ? Number(error.status) || 500 : 500; return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao executar o relatório." }, { status }); }
}
