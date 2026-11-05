export type DependencyState = "ok" | "error" | "not_configured";

export type DependencyHealth = {
  status: DependencyState;
  latencyMs: number;
};

export type SystemHealth = {
  status: "ok" | "degraded";
  timestamp: string;
  dependencies: {
    postgres: DependencyHealth;
    firebirdGateway: DependencyHealth;
    redis: DependencyHealth;
  };
};

type HealthOptions = {
  env?: Record<string, string | undefined>;
  now?: () => number;
  checkPostgres: () => Promise<unknown>;
  fetchImpl?: typeof fetch;
  pingRedis?: () => Promise<unknown>;
  timeoutMs?: number;
};

async function measuredCheck(check: () => Promise<unknown>, now: () => number): Promise<DependencyHealth> {
  const startedAt = now();
  try {
    await check();
    return { status: "ok", latencyMs: Math.max(0, now() - startedAt) };
  } catch {
    return { status: "error", latencyMs: Math.max(0, now() - startedAt) };
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Health check timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function getSystemHealth(options: HealthOptions): Promise<SystemHealth> {
  const env = options.env ?? process.env;
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? 5_000;
  const gatewayUrl = String(env.FIREBIRD_GATEWAY_URL ?? "").trim().replace(/\/+$/, "");
  const gatewayConfigured = Boolean(
    gatewayUrl && env.FIREBIRD_GATEWAY_TOKEN_ID && env.FIREBIRD_GATEWAY_HMAC_SECRET,
  );
  const redisRequested = Boolean(env.UPSTASH_REDIS_REST_URL || env.UPSTASH_REDIS_REST_TOKEN);
  const redisConfigured = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);

  const [postgres, firebirdGateway, redis] = await Promise.all([
    env.DATABASE_URL
      ? measuredCheck(() => withTimeout(options.checkPostgres(), timeoutMs), now)
      : Promise.resolve({ status: "not_configured" as const, latencyMs: 0 }),
    gatewayConfigured
      ? measuredCheck(async () => {
        const response = await withTimeout((options.fetchImpl ?? fetch)(`${gatewayUrl}/health`, {
          cache: "no-store",
          signal: AbortSignal.timeout(timeoutMs),
        }), timeoutMs);
        if (!response.ok) throw new Error("Gateway health check failed");
      }, now)
      : Promise.resolve({ status: "not_configured" as const, latencyMs: 0 }),
    redisConfigured && options.pingRedis
      ? measuredCheck(() => withTimeout(options.pingRedis!(), timeoutMs), now)
      : Promise.resolve({
        status: redisRequested ? "error" as const : "not_configured" as const,
        latencyMs: 0,
      }),
  ]);

  const requiredHealthy = postgres.status === "ok" && firebirdGateway.status === "ok";
  const configuredRedisHealthy = !redisRequested || redis.status === "ok";

  return {
    status: requiredHealthy && configuredRedisHealthy ? "ok" : "degraded",
    timestamp: new Date(now()).toISOString(),
    dependencies: { postgres, firebirdGateway, redis },
  };
}
