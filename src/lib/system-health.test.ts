import { describe, expect, it, vi } from "vitest";
import { getSystemHealth } from "./system-health";

const configuredEnv = {
  DATABASE_URL: "postgres://example",
  FIREBIRD_GATEWAY_URL: "https://gateway.example/",
  FIREBIRD_GATEWAY_TOKEN_ID: "checklist-terrazi",
  FIREBIRD_GATEWAY_HMAC_SECRET: "secret",
  UPSTASH_REDIS_REST_URL: "https://redis.example",
  UPSTASH_REDIS_REST_TOKEN: "token",
};

describe("getSystemHealth", () => {
  it("reports all configured dependencies as healthy", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const health = await getSystemHealth({
      env: configuredEnv,
      checkPostgres: vi.fn().mockResolvedValue(undefined),
      pingRedis: vi.fn().mockResolvedValue("PONG"),
      fetchImpl,
    });

    expect(health.status).toBe("ok");
    expect(health.dependencies.postgres.status).toBe("ok");
    expect(health.dependencies.firebirdGateway.status).toBe("ok");
    expect(health.dependencies.redis.status).toBe("ok");
    expect(fetchImpl).toHaveBeenCalledWith("https://gateway.example/health", expect.any(Object));
  });

  it("reports missing required configuration without attempting connections", async () => {
    const checkPostgres = vi.fn();
    const fetchImpl = vi.fn();
    const health = await getSystemHealth({ env: {}, checkPostgres, fetchImpl });

    expect(health.status).toBe("degraded");
    expect(health.dependencies.postgres.status).toBe("not_configured");
    expect(health.dependencies.firebirdGateway.status).toBe("not_configured");
    expect(health.dependencies.redis.status).toBe("not_configured");
    expect(checkPostgres).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports a failing configured dependency as degraded", async () => {
    const health = await getSystemHealth({
      env: configuredEnv,
      checkPostgres: vi.fn().mockResolvedValue(undefined),
      pingRedis: vi.fn().mockResolvedValue("PONG"),
      fetchImpl: vi.fn().mockResolvedValue({ ok: false }),
    });

    expect(health.status).toBe("degraded");
    expect(health.dependencies.firebirdGateway.status).toBe("error");
  });
});
