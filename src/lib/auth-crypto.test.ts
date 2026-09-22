import { describe, expect, it } from "vitest";
import { hashSessionToken, legacyPasswordHash, tokensMatch, verifyLegacyPassword } from "./auth-crypto";

describe("legacy password compatibility", () => {
  it("matches Node's lowercase MD5 format", () => {
    expect(legacyPasswordHash("senha123")).toBe("e7d80ffeefa212b7c5c55700e4f7193e");
  });

  it("verifies valid hashes without accepting malformed values", () => {
    expect(verifyLegacyPassword("senha123", "E7D80FFEEFA212B7C5C55700E4F7193E")).toBe(true);
    expect(verifyLegacyPassword("wrong", "e7d80ffeefa212b7c5c55700e4f7193e")).toBe(false);
    expect(verifyLegacyPassword("senha123", "invalid")).toBe(false);
  });
});

describe("server token helpers", () => {
  it("hashes tokens deterministically and compares secrets safely", () => {
    expect(hashSessionToken("token")).toHaveLength(64);
    expect(tokensMatch("secret", "secret")).toBe(true);
    expect(tokensMatch("wrong", "secret")).toBe(false);
  });
});
