import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function legacyPasswordHash(password: string) {
  return createHash("md5").update(password, "utf8").digest("hex").toLowerCase();
}

export function verifyLegacyPassword(password: string, storedHash: string) {
  const actual = legacyPasswordHash(password);
  const expected = storedHash.trim().toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(expected)) return false;
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function tokensMatch(provided: string, expected: string) {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
