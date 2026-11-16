import { describe, expect, it } from "vitest";
import { calculateStageSuccess, identifyItemConferenceStage, identifyStage, identifyStageStatusStep, isFailedStageAnswer, isStageApplicabilityQuestion, stageDefinitions, stageStatuses } from "./stages";

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

  it("distinguishes applicability questions from operational confirmations", () => {
    expect(isStageApplicabilityQuestion("Tem desmontagem?")).toBe(true);
    expect(isStageApplicabilityQuestion("Possui impermeabilização?")).toBe(true);
    expect(isStageApplicabilityQuestion("Desmontagem realizada?")).toBe(false);
    expect(isStageApplicabilityQuestion("Impermeabilização concluída?")).toBe(false);
  });

  it("ignores delivery feedback when resolving the operational status", () => {
    expect(identifyStageStatusStep("Pedido Entregue?")).toBe("delivery");
    expect(identifyStageStatusStep("Pós satisfação sobre a entrega realizado?")).toBeNull();
    expect(identifyStageStatusStep("Deseja registrar feedback da entrega?")).toBeNull();
  });

  it("uses only the authoritative result question for each stage", () => {
    expect(identifyStageStatusStep("Separação Realizada?")).toBe("separation");
    expect(identifyStageStatusStep("Agendamento Montagem Realizado?")).toBeNull();
    expect(identifyStageStatusStep("Montado Com Sucesso?")).toBe("assembly");
    expect(identifyStageStatusStep("Desmontagem Realizada?")).toBe("disassembly");
    expect(identifyStageStatusStep("Impermeabilização concluída?")).toBe("waterproofing");
    expect(identifyStageStatusStep("Pedido Entregue?")).toBe("delivery");
  });

  it("associates a generic product conference with separation", () => {
    expect(identifyItemConferenceStage("Conferência dos Produtos")).toBe("separation");
  });

  it("recognizes failed manual and historical automatic answers", () => {
    expect(isFailedStageAnswer(false)).toBe(true);
    expect(isFailedStageAnswer("Não")).toBe(true);
    expect(isFailedStageAnswer("RETORNO")).toBe(true);
    expect(isFailedStageAnswer("RETORNO AO DEPÓSITO")).toBe(true);
    expect(isFailedStageAnswer("ENTREGUE")).toBe(false);
    expect(isFailedStageAnswer("Sim")).toBe(false);
  });

  it("calculates overall success ignoring stages that the sale does not have", () => {
    expect(calculateStageSuccess({ separation: "completed", disassembly: "notApplicable", waterproofing: "partiallyCompleted", delivery: "completed", assembly: "pending" })).toBe(63);
  });
});
