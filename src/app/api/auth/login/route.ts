import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyLegacyPassword } from "@/lib/auth-crypto";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limit = await rateLimit("login", requestIp(request));
  if (!limit.success) return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Informe login e senha." }, { status: 400 });

  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.login}) = ${parsed.data.login}`)
    .limit(1);

  if (!user || !user.active || !verifyLegacyPassword(parsed.data.password, user.passwordHash)) {
    return NextResponse.json({ error: "Login ou senha inválidos." }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ redirectTo: user.isAdmin ? "/admin/checklists" : "/dashboard" });
}
