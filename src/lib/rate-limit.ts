import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;
const limiters = redis
  ? {
      login: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(8, "1 m"), prefix: "ratelimit:login" }),
      sync: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "1 m"), prefix: "ratelimit:sync" }),
    }
  : null;

const localAttempts = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(kind: "login" | "sync", identifier: string) {
  if (limiters) return limiters[kind].limit(identifier);
  const now = Date.now();
  const key = `${kind}:${identifier}`;
  const max = kind === "login" ? 8 : 30;
  const current = localAttempts.get(key);
  if (!current || current.resetAt <= now) {
    localAttempts.set(key, { count: 1, resetAt: now + 60_000 });
    return { success: true };
  }
  current.count += 1;
  return { success: current.count <= max };
}

export function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
