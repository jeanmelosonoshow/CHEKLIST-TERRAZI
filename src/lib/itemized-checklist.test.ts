import { describe, expect, it } from "vitest";
import { prepareItemizedAnswers } from "./itemized-checklist";

const items = [
  { code: "46032", description: "Cadeira", quantity: 3 },
  { code: "43042", description: "Base", quantity: 1 },
];

describe("prepareItemizedAnswers", () => {
  it("exige a sinalização de todos os produtos ao concluir", () => {
    const result = prepareItemizedAnswers(items, [{ itemIndex: 0, success: true }], true);
    expect(result.error).toContain("todos os 2 produtos");
  });

  it("consolida sucesso somente quando todos os produtos têm sucesso", () => {
    expect(prepareItemizedAnswers(items, [{ itemIndex: 0, success: true }, { itemIndex: 1, success: true }], true).aggregate).toBe(true);
    expect(prepareItemizedAnswers(items, [{ itemIndex: 0, success: true }, { itemIndex: 1, success: false, observation: "Avaria" }], true).aggregate).toBe(false);
  });

  it("preserva os dados do produto para relatórios", () => {
    const result = prepareItemizedAnswers(items, [{ itemIndex: 1, success: false }], false);
    expect(result.answers[0]).toMatchObject({ productCode: "43042", productDescription: "Base", quantity: "1", success: false });
  });
});
