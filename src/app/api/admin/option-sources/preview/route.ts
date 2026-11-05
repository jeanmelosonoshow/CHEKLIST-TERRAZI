import { NextResponse } from "next/server";
import { getApiAdmin } from "@/lib/api-auth";
import { validateDashboardQuery } from "@/lib/dashboard-query";
import { resolveOptionSource } from "@/lib/option-sources";
import { rateLimit } from "@/lib/rate-limit";
import { optionSourcePreviewSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await getApiAdmin();
  if ("error" in auth) return auth.error;
  const limit = await rateLimit("dashboard", auth.user.id);
  if (!limit.success) return NextResponse.json({ error: "Muitas consultas em sequência. Aguarde um minuto." }, { status: 429 });
  const parsed = optionSourcePreviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Revise a consulta e os campos de retorno.", details: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.querySql) {
    const validation = validateDashboardQuery(parsed.data.querySql);
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  try {
    const now = new Date();
    const options = await resolveOptionSource({
      key: "preview", label: "Prévia", description: null, active: true, schema: {},
      sourceType: parsed.data.sourceType, querySql: parsed.data.querySql || null,
      resultValueField: parsed.data.resultValueField, resultLabelField: parsed.data.resultLabelField,
      staticOptions: parsed.data.staticOptions, lastSyncedAt: null, createdAt: now, updatedAt: now,
    }, auth.user);
    return NextResponse.json({ options: options.slice(0, 20), totalPreview: Math.min(options.length, 20) });
  } catch (error) {
    const status = error instanceof Error && "status" in error ? Number(error.status) || 500 : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível executar a consulta da fonte." }, { status });
  }
}
