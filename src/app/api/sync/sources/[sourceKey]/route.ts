import { eq, notInArray, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { syncedRecords, syncedSources, syncRuns } from "@/db/schema";
import { authorizeSync } from "@/lib/sync-auth";

const payloadSchema = z.object({
  label: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional(),
  schema: z.record(z.string(), z.unknown()).default({}),
  fullSnapshot: z.boolean().default(true),
  records: z.array(z.object({
    externalId: z.coerce.string().min(1).max(200),
    label: z.string().trim().min(1).max(300),
    data: z.record(z.string(), z.unknown()).default({}),
  })).max(10000),
});

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, context: { params: Promise<{ sourceKey: string }> }) {
  if (!authorizeSync(request)) return NextResponse.json({ error: "Token de sincronização inválido." }, { status: 401 });
  const { sourceKey } = await context.params;
  if (!/^[a-z0-9][a-z0-9_-]{1,99}$/.test(sourceKey)) return NextResponse.json({ error: "Identificador da fonte inválido." }, { status: 400 });
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido.", details: parsed.error.flatten() }, { status: 400 });

  const [run] = await db.insert(syncRuns).values({ source: `firebird.${sourceKey}`, receivedCount: parsed.data.records.length }).returning();
  try {
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx.insert(syncedSources).values({
        key: sourceKey, label: parsed.data.label, description: parsed.data.description, schema: parsed.data.schema, lastSyncedAt: now,
      }).onConflictDoUpdate({
        target: syncedSources.key,
        set: { label: parsed.data.label, description: parsed.data.description, schema: parsed.data.schema, active: true, lastSyncedAt: now, updatedAt: now },
      });
      for (const record of parsed.data.records) {
        await tx.insert(syncedRecords).values({ sourceKey, externalId: record.externalId, label: record.label, data: record.data, lastSyncedAt: now })
          .onConflictDoUpdate({
            target: [syncedRecords.sourceKey, syncedRecords.externalId],
            set: { label: record.label, data: record.data, active: true, lastSyncedAt: now },
          });
      }
      if (parsed.data.fullSnapshot) {
        const ids = parsed.data.records.map((record) => record.externalId);
        const sourceFilter = eq(syncedRecords.sourceKey, sourceKey);
        await tx.update(syncedRecords).set({ active: false }).where(ids.length ? and(sourceFilter, notInArray(syncedRecords.externalId, ids)) : sourceFilter);
      }
    });
    await db.update(syncRuns).set({ status: "success", processedCount: parsed.data.records.length, completedAt: new Date() }).where(eq(syncRuns.id, run.id));
    return NextResponse.json({ syncRunId: run.id, processed: parsed.data.records.length });
  } catch (error) {
    await db.update(syncRuns).set({ status: "failed", errorMessage: error instanceof Error ? error.message.slice(0, 1000) : "Unknown error", completedAt: new Date() }).where(eq(syncRuns.id, run.id));
    return NextResponse.json({ error: "Falha ao sincronizar fonte.", syncRunId: run.id }, { status: 500 });
  }
}
