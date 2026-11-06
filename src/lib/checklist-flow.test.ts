import { describe, expect, it } from "vitest";
import { normalizeDecisionValue, selectNextEdge, validateFlowDefinition, type FlowDefinition } from "./checklist-flow";

const validFlow: FlowDefinition = {
  nodes: [
    { nodeKey: "inicio", type: "start", title: "Início", position: 0 },
    { nodeKey: "aprovado", type: "question", title: "Aprovado?", fieldType: "boolean", required: true, position: 1 },
    { nodeKey: "sucesso", type: "end", title: "Sucesso", outcome: "success", position: 2 },
    { nodeKey: "falha", type: "end", title: "Falha", outcome: "failure", position: 3 },
  ],
  edges: [
    { sourceKey: "inicio", targetKey: "aprovado", condition: "always", priority: 0 },
    { sourceKey: "aprovado", targetKey: "sucesso", condition: "equals", conditionValue: true, priority: 0 },
    { sourceKey: "aprovado", targetKey: "falha", condition: "equals", conditionValue: false, priority: 1 },
  ],
};

describe("checklist flow", () => {
  it("validates a complete branching flow", () => expect(validateFlowDefinition(validFlow)).toEqual([]));
  it("rejects a block connected directly to itself", () => {
    const flow = structuredClone(validFlow); flow.edges[1].targetKey = "aprovado";
    expect(validateFlowDefinition(flow).join(" ")).toMatch(/ele mesmo/i);
  });
  it("selects conditional branches and normalizes Firebird booleans", () => {
    expect(normalizeDecisionValue("SIM")).toBe(true);
    expect(selectNextEdge(validFlow.edges.filter((edge) => edge.sourceKey === "aprovado"), "N")?.targetKey).toBe("falha");
  });
  it("supports numeric conditions for entry validation", () => {
    const edges = [{ sourceKey: "inicio", targetKey: "proximo", condition: "greater_than" as const, conditionValue: 0, priority: 0 }];
    expect(selectNextEdge(edges, 1)?.targetKey).toBe("proximo");
    expect(selectNextEdge(edges, 0)).toBeNull();
  });
  it("does not allow an unconditional connector on automatic entry validation", () => {
    const flow = structuredClone(validFlow);
    Object.assign(flow.nodes[0], { automationSource: "firebird", querySql: "SELECT COUNT(*) AS QTDE FROM SAIDA", resultField: "QTDE" });
    expect(validateFlowDefinition(flow).join(" ")).toMatch(/não pode usar conexão.*Sempre/i);
  });
});
