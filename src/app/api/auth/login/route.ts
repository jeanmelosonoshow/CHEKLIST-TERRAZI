import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { legacyPasswordHash } from "@/lib/auth-crypto";
import { authenticateFirebirdUser } from "@/lib/firebird-users";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/validation";
import { getLandingPath, isAdministrator } from "@/lib/permissions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limit = await rateLimit("login", requestIp(request));
  if (!limit.success) return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Informe login e senha." }, { status: 400 });

  const passwordHash = legacyPasswordHash(parsed.data.password);
  let firebirdUser;
  try {
    firebirdUser = await authenticateFirebirdUser(parsed.data.login, passwordHash);
  } catch (error) {
    console.error("Falha ao validar usuário pelo Gateway Firebird:", error);
    return NextResponse.json(
      { error: "Não foi possível consultar o sistema de usuários. Tente novamente." },
      { status: 503 },
    );
  }

  if (!firebirdUser) {
    return NextResponse.json({ error: "Login ou senha inválidos." }, { status: 401 });
  }

  const now = new Date();
  const [user] = await db
    .insert(users)
    .values({
      branchId: firebirdUser.branchId,
      category: firebirdUser.category ?? null,
      employeeId: firebirdUser.employeeId,
      employeeName: firebirdUser.employeeName,
      login: firebirdUser.login,
      passwordHash,
      active: true,
      isAdmin: isAdministrator(firebirdUser),
      lastSyncedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: users.employeeId,
      set: {
        branchId: firebirdUser.branchId,
        category: firebirdUser.category ?? null,
        employeeName: firebirdUser.employeeName,
        login: firebirdUser.login,
        passwordHash,
        active: true,
        isAdmin: isAdministrator(firebirdUser),
        lastSyncedAt: now,
        updatedAt: now,
      },
    })
    .returning();

  await createSession(user.id);
  return NextResponse.json({ redirectTo: await getLandingPath(user) });
}
