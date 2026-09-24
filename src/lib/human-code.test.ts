import { describe, expect, it } from "vitest";
import { formatHumanCode } from "./human-code";

describe("formatHumanCode", () => {
  it("creates stable, readable codes", () => {
    expect(formatHumanCode("CHK", 1)).toBe("CHK-000001");
    expect(formatHumanCode("CMP", 125)).toBe("CMP-000125");
  });
});
