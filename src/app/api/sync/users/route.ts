import {
  eq,
  notInArray,
  sql,
} from "drizzle-orm";

import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  syncRuns,
  users,
} from "@/db/schema";

import {
  rateLimit,
  requestIp,
} from "@/lib/rate-limit";

import { authorizeSync } from "@/lib/sync-auth";
import { syncUsersSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  request: Request,
) {
  if (!authorizeSync(request)) {
    return NextResponse.json(
      {
        error:
          "Token de sincronização inválido.",
      },
      {
        status: 401,
      },
    );
  }

  const limit = await rateLimit(
    "sync",
    requestIp(request),
  );

  if (!limit.success) {
    return NextResponse.json(
      {
        error:
          "Limite de sincronização excedido.",
      },
      {
        status: 429,
      },
    );
  }

  const corpo = await request
    .json()
    .catch(() => null);

  const parsed =
    syncUsersSchema.safeParse(corpo);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Payload inválido.",

        details:
          parsed.error.flatten(),
      },
      {
        status: 400,
      },
    );
  }

  const quantidadeRecebida =
    parsed.data.users.length;

  const [run] = await db
    .insert(syncRuns)
    .values({
      source:
        "firebird.funcionario",

      receivedCount:
        quantidadeRecebida,
    })
    .returning();

  try {
    const agora = new Date();

    /*
     * Prepara todos os registros antes
     * de iniciar a transação.
     */
    const valores = parsed.data.users.map(
      (item) => ({
        branchId:
          item.idfilial,

        category:
          item.categoria ?? null,

        employeeId:
          item.idfuncionario,

        employeeName:
          item.nomefuncionario,

        login:
          item.login,

        passwordHash:
          item.senha.toLowerCase(),

        active: true,

        isAdmin:
          item.idfuncionario === 752,

        sourceUpdatedAt:
          parsed.data.sourceTimestamp ??
          null,

        lastSyncedAt:
          agora,

        updatedAt:
          agora,
      }),
    );

    await db.transaction(
      async (tx) => {
        /*
         * Um único INSERT com todos os usuários.
         * Em caso de conflito no ID do funcionário,
         * os dados vêm da linha "excluded".
         */
        if (valores.length > 0) {
          await tx
            .insert(users)
            .values(valores)
            .onConflictDoUpdate({
              target:
                users.employeeId,

              set: {
                branchId:
                  sql.raw(
                    `excluded.${users.branchId.name}`,
                  ),

                category:
                  sql.raw(
                    `excluded.${users.category.name}`,
                  ),

                employeeName:
                  sql.raw(
                    `excluded.${users.employeeName.name}`,
                  ),

                login:
                  sql.raw(
                    `excluded.${users.login.name}`,
                  ),

                passwordHash:
                  sql.raw(
                    `excluded.${users.passwordHash.name}`,
                  ),

                active:
                  sql.raw(
                    `excluded.${users.active.name}`,
                  ),

                isAdmin:
                  sql.raw(
                    `excluded.${users.isAdmin.name}`,
                  ),

                sourceUpdatedAt:
                  sql.raw(
                    `excluded.${users.sourceUpdatedAt.name}`,
                  ),

                lastSyncedAt:
                  sql.raw(
                    `excluded.${users.lastSyncedAt.name}`,
                  ),

                updatedAt:
                  sql.raw(
                    `excluded.${users.updatedAt.name}`,
                  ),
              },
            });
        }

        /*
         * Somente um snapshot completo pode
         * desativar usuários ausentes.
         */
        if (
          parsed.data.fullSnapshot
        ) {
          const ids =
            parsed.data.users.map(
              (item) =>
                item.idfuncionario,
            );

          if (ids.length > 0) {
            await tx
              .update(users)
              .set({
                active: false,
                updatedAt: agora,
              })
              .where(
                notInArray(
                  users.employeeId,
                  ids,
                ),
              );
          } else {
            await tx
              .update(users)
              .set({
                active: false,
                updatedAt: agora,
              });
          }
        }
      },
    );

    await db
      .update(syncRuns)
      .set({
        status: "success",

        processedCount:
          quantidadeRecebida,

        completedAt:
          new Date(),
      })
      .where(
        eq(
          syncRuns.id,
          run.id,
        ),
      );

    return NextResponse.json({
      syncRunId: run.id,
      processed:
        quantidadeRecebida,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.slice(
            0,
            1000,
          )
        : "Erro desconhecido na sincronização.";

    await db
      .update(syncRuns)
      .set({
        status: "failed",
        errorMessage: message,
        completedAt: new Date(),
      })
      .where(
        eq(
          syncRuns.id,
          run.id,
        ),
      );

    console.error(
      "Falha ao sincronizar usuários:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Falha ao sincronizar usuários.",

        details:
          process.env.NODE_ENV ===
          "development"
            ? message
            : undefined,

        syncRunId:
          run.id,
      },
      {
        status: 500,
      },
    );
  }
}