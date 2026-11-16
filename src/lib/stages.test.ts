import { describe, expect, it } from "vitest";
import { identifyStage, stageDefinitions, stageStatuses } from "./stages";

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

  it("maps flow block titles to the operational stage", () => {
    expect(identifyStage("Separação realizada? ")).toBe("separation");
    expect(identifyStage("Possui Desmontagem? ")).toBe("disassembly");
    expect(identifyStage("Impermeabilização concluída")).toBe("waterproofing");
    expect(identifyStage("Pedido entregue")).toBe("delivery");
    expect(identifyStage("Montagem finalizada")).toBe("assembly");
  });
});
