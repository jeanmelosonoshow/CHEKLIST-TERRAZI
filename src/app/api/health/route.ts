import { sql as query } from "drizzle-orm";
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { db } from "@/db";
import { getSystemHealth } from "@/lib/system-health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;
  const health = await getSystemHealth({
    checkPostgres: () => db.execute(query`select 1`),
    pingRedis: redis ? () => redis.ping() : undefined,
  });

  return NextResponse.json(health, { status: health.status === "ok" ? 200 : 503 });
}
