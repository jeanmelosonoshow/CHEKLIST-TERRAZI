import { NextResponse } from "next/server";
import { getApiAdmin } from "@/lib/api-auth";
import { executeReport } from "@/lib/reports";
import { reportPreviewSchema } from "@/lib/validation";

export const runtime = "nodejs"; export const maxDuration = 60;
export async function POST(request: Request) {
  const auth = await getApiAdmin(); if ("error" in auth) return auth.error;
  const parsed = reportPreviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Revise as consultas." }, { status: 400 });
  try { return NextResponse.json(await executeReport(parsed.data, { branchId: auth.user.branchId, employeeId: auth.user.employeeId, category: auth.user.category }, 20)); }
  catch (error) { const status = error instanceof Error && "status" in error ? Number(error.status) || 500 : 500; return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao testar o relatório." }, { status }); }
}
