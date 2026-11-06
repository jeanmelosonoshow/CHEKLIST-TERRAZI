export type FlowNodeType = "start" | "question" | "automatic_decision" | "action" | "observation" | "end";
export type FlowFieldType = "short_text" | "long_text" | "number" | "date" | "boolean" | "single_select" | "multi_select";
export type FlowNodeDefinition = {
  id?: string; nodeKey: string; type: FlowNodeType; title: string; description?: string | null;
  fieldType?: FlowFieldType | null; required?: boolean; sourceKey?: string | null;
  automationSource?: "postgres" | "firebird" | null; querySql?: string | null; resultField?: string;
  customerResultField?: string | null; outcome?: "success" | "failure" | null; position: number; configurationSelected?: boolean;
};
export type FlowEdgeDefinition = {
  sourceKey: string; targetKey: string; condition: "always" | "equals" | "not_equals" | "greater_than" | "greater_or_equal" | "less_than" | "less_or_equal";
  conditionValue?: unknown; label?: string | null; priority: number;
};
export type FlowDefinition = { nodes: FlowNodeDefinition[]; edges: FlowEdgeDefinition[] };

export function validateFlowDefinition(flow: FlowDefinition) {
  const errors: string[] = [];
  const keys = flow.nodes.map((node) => node.nodeKey);
  const keySet = new Set(keys);
  if (keySet.size !== keys.length) errors.push("Existem blocos com a mesma chave.");
  const starts = flow.nodes.filter((node) => node.type === "start");
  if (starts.length !== 1) errors.push("O fluxo deve possuir exatamente um bloco de início.");
  if (!flow.nodes.some((node) => node.type === "end")) errors.push("O fluxo deve possuir pelo menos um encerramento.");
  for (const node of flow.nodes) {
    if ((node.type === "question" || node.type === "action") && !node.fieldType) errors.push(`Defina o tipo de resposta de “${node.title}”.`);
    if (node.type === "automatic_decision" && (!node.automationSource || !node.querySql || !node.resultField)) errors.push(`Configure a consulta automática de “${node.title}”.`);
    if (node.type === "start" && node.automationSource && (!node.querySql || !node.resultField)) errors.push("Configure a consulta de validação do bloco inicial.");
    if (node.type === "end" && !node.outcome) errors.push(`Defina o resultado do encerramento “${node.title}”.`);
    const outgoing = flow.edges.filter((edge) => edge.sourceKey === node.nodeKey);
    if (node.type === "start" && node.automationSource && outgoing.some((edge) => edge.condition === "always")) errors.push("A validação inicial não pode usar conexão “Sempre”; configure uma condição de aprovação, como maior que 0.");
    if (node.type === "end" && outgoing.length) errors.push(`O encerramento “${node.title}” não pode possuir próximo passo.`);
    if (node.type !== "end" && !outgoing.length) errors.push(`O bloco “${node.title}” precisa de uma conexão de saída.`);
  }
  for (const edge of flow.edges) {
    if (!keySet.has(edge.sourceKey) || !keySet.has(edge.targetKey)) errors.push("Existe uma conexão apontando para um bloco inexistente.");
    if (edge.sourceKey === edge.targetKey) errors.push("Um bloco não pode apontar diretamente para ele mesmo.");
  }
  if (starts.length === 1 && errors.length === 0) {
    const visited = new Set<string>(); const visiting = new Set<string>(); let cycle = false;
    function walk(key: string) {
      if (visiting.has(key)) { cycle = true; return; }
      if (visited.has(key)) return;
      visiting.add(key);
      for (const edge of flow.edges.filter((item) => item.sourceKey === key)) walk(edge.targetKey);
      visiting.delete(key); visited.add(key);
    }
    walk(starts[0].nodeKey);
    if (cycle) errors.push("O fluxo possui um ciclo. Nesta versão, todos os caminhos devem avançar até um encerramento.");
    const unreachable = flow.nodes.find((node) => !visited.has(node.nodeKey));
    if (unreachable) errors.push(`O bloco “${unreachable.title}” não pode ser alcançado a partir do início.`);
    const startTarget = flow.edges.find((edge) => edge.sourceKey === starts[0].nodeKey)?.targetKey;
    if (flow.nodes.find((node) => node.nodeKey === startTarget)?.type === "end") errors.push("O início deve levar a uma etapa antes do encerramento.");
  }
  return errors;
}

export function normalizeDecisionValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "s", "sim", "y", "yes", "t"].includes(normalized)) return true;
  if (["false", "0", "n", "nao", "não", "no", "f"].includes(normalized)) return false;
  return value;
}

export function selectNextEdge(edges: FlowEdgeDefinition[], rawValue: unknown) {
  const value = normalizeDecisionValue(rawValue);
  const sorted = [...edges].sort((a, b) => a.priority - b.priority);
  const conditional = sorted.find((edge) => {
    const expected = normalizeDecisionValue(edge.conditionValue);
    if (edge.condition === "equals") return Object.is(value, expected);
    if (edge.condition === "not_equals") return !Object.is(value, expected);
    if (typeof value !== "number" || typeof expected !== "number") return false;
    if (edge.condition === "greater_than") return value > expected;
    if (edge.condition === "greater_or_equal") return value >= expected;
    if (edge.condition === "less_than") return value < expected;
    if (edge.condition === "less_or_equal") return value <= expected;
    return false;
  });
  return conditional ?? sorted.find((edge) => edge.condition === "always") ?? null;
}
