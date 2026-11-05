import { describe, expect, it } from "vitest";
import { answerIsEmpty, validateChecklistAnswers } from "./checklist-execution";

const fields = [
  { id: "11111111-1111-4111-8111-111111111111", label: "Conferido?", type: "boolean", required: true },
  { id: "22222222-2222-4222-8222-222222222222", label: "Status", type: "single_select", required: true },
] as never;

describe("checklist execution validation", () => {
  it("treats false as a valid filled answer", () => {
    expect(answerIsEmpty(false)).toBe(false);
    expect(validateChecklistAnswers(fields, {
      "11111111-1111-4111-8111-111111111111": false,
      "22222222-2222-4222-8222-222222222222": "P",
    }, true)).toBeNull();
  });

  it("blocks completion while a required answer is missing", () => {
    expect(validateChecklistAnswers(fields, { "11111111-1111-4111-8111-111111111111": true }, true)).toContain("Status");
  });
});
