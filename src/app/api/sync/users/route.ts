import { eq, notInArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { syncRuns, users } from "@/db/schema";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { authorizeSync } from "@/lib/sync-auth";
import { syncUsersSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!authorizeSync(request)) {
    return NextResponse.json(
      { error: "Token de sincronização inválido." },
      { status: 401 }
    );
  }

  const limit = await rateLimit("sync", requestIp(request));

  if (!limit.success) {
    return NextResponse.json(
      { error: "Limite de sincronização excedido." },
      { status: 429 }
    );
  }

  const corpo = await request.json().catch(() => null);
  const parsed = syncUsersSchema.safeParse(corpo);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Payload inválido.",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const [run] = await db
    .insert(syncRuns)
    .values({
      source: "firebird.funcionario",
      receivedCount: parsed.data.users.length,
    })
    .returning();

  try {
    const agora = new Date();

    await db.transaction(async (tx) => {
      for (const item of parsed.data.users) {
        await tx
          .insert(users)
          .values({
            branchId: item.idfilial,
            category: item.categoria ?? null,
            employeeId: item.idfuncionario,
            employeeName: item.nomefuncionario,
            login: item.login,
            passwordHash: item.senha.toLowerCase(),
            active: true,
            isAdmin: item.idfuncionario === 752,
            sourceUpdatedAt: parsed.data.sourceTimestamp ?? null,
            lastSyncedAt: agora,
            updatedAt: agora,
          })
          .onConflictDoUpdate({
            target: users.employeeId,
            set: {
              branchId: item.idfilial,
              category: item.categoria ?? null,
              employeeName: item.nomefuncionario,
              login: item.login,
              passwordHash: item.senha.toLowerCase(),
              active: true,
              isAdmin: item.idfuncionario === 752,
              sourceUpdatedAt: parsed.data.sourceTimestamp ?? null,
              lastSyncedAt: agora,
              updatedAt: agora,
            },
          });
      }

      if (parsed.data.fullSnapshot) {
        const ids = parsed.data.users.map(
          (item) => item.idfuncionario
        );

        if (ids.length > 0) {
          await tx
            .update(users)
            .set({
              active: false,
              updatedAt: agora,
            })
            .where(notInArray(users.employeeId, ids));
        } else {
          await tx
            .update(users)
            .set({
              active: false,
              updatedAt: agora,
            });
        }
      }
    });

    await db
      .update(syncRuns)
      .set({
        status: "success",
        processedCount: parsed.data.users.length,
        completedAt: new Date(),
      })
      .where(eq(syncRuns.id, run.id));

    return NextResponse.json({
      syncRunId: run.id,
      processed: parsed.data.users.length,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.slice(0, 1000)
        : "Erro desconhecido na sincronização.";

    await db
      .update(syncRuns)
      .set({
        status: "failed",
        errorMessage: message,
        completedAt: new Date(),
      })
      .where(eq(syncRuns.id, run.id));

    return NextResponse.json(
      {
        error: "Falha ao sincronizar usuários.",
        syncRunId: run.id,
      },
      { status: 500 }
    );
  }
}
