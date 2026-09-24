import { describe, expect, it } from "vitest";
import { stageDefinitions, stageStatuses } from "./stages";

describe("stages model", () => {
  it("keeps the five initial stages in the expected order", () => {
    expect(stageDefinitions.map((stage) => stage.label)).toEqual([
      "Separação",
      "Desmontagem",
      "Impermeabilização",
      "Entrega",
      "Montagem",
    ]);
  });

  it("defines every requested status", () => {
    expect(Object.values(stageStatuses).map((status) => status.label)).toEqual([
      "Pendente",
      "Concluído com sucesso",
      "Não realizado",
      "Realizado parcialmente",
      "Não possui",
    ]);
  });
});
