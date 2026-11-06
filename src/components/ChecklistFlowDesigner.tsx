"use client";

import type { FlowDefinition, FlowEdgeDefinition, FlowNodeDefinition, FlowNodeType } from "@/lib/checklist-flow";

const nodeLabels: Record<FlowNodeType, string> = { start: "Início", question: "Pergunta", automatic_decision: "Decisão automática", action: "Ação / confirmação", observation: "Observação", end: "Encerramento" };
const fieldTypes = [["short_text", "Texto curto"], ["long_text", "Texto longo"], ["number", "Número"], ["date", "Data"], ["boolean", "Sim / Não"], ["single_select", "Seleção única"], ["multi_select", "Seleção múltipla"]] as const;

export function createDefaultFlow(): FlowDefinition {
  return {
    nodes: [
      { nodeKey: "inicio", type: "start", title: "Início", position: 0 },
      { nodeKey: "pergunta_inicial", type: "question", title: "Nova pergunta", fieldType: "boolean", required: true, position: 1 },
      { nodeKey: "final_sucesso", type: "end", title: "Finalizado com sucesso", outcome: "success", position: 2 },
      { nodeKey: "final_sem_sucesso", type: "end", title: "Finalizado sem sucesso", outcome: "failure", position: 3 },
    ],
    edges: [
      { sourceKey: "inicio", targetKey: "pergunta_inicial", condition: "always", label: "Começar", priority: 0 },
      { sourceKey: "pergunta_inicial", targetKey: "final_sucesso", condition: "equals", conditionValue: true, label: "Sim", priority: 0 },
      { sourceKey: "pergunta_inicial", targetKey: "final_sem_sucesso", condition: "equals", conditionValue: false, label: "Não", priority: 1 },
    ],
  };
}

export function ChecklistFlowDesigner({ value, onChange, sources }: { value: FlowDefinition; onChange: (flow: FlowDefinition) => void; sources: { key: string; label: string }[] }) {
  const selectedKey = value.nodes.find((node) => node.configurationSelected)?.nodeKey ?? value.nodes[0]?.nodeKey;
  const selected = value.nodes.find((node) => node.nodeKey === selectedKey) ?? value.nodes[0];
  function select(nodeKey: string) { onChange({ ...value, nodes: value.nodes.map((node) => ({ ...node, configurationSelected: node.nodeKey === nodeKey } as FlowNodeDefinition)) }); }
  function updateNode(patch: Partial<FlowNodeDefinition>) { if (!selected) return; onChange({ ...value, nodes: value.nodes.map((node) => node.nodeKey === selected.nodeKey ? { ...node, ...patch } : node) }); }
  function addNode(type: Exclude<FlowNodeType, "start">) {
    const key = `${type}_${crypto.randomUUID().slice(0, 8)}`;
    const node: FlowNodeDefinition = { nodeKey: key, type, title: nodeLabels[type], position: value.nodes.length, required: type === "observation", fieldType: type === "question" ? "boolean" : type === "action" ? "boolean" : null, automationSource: type === "automatic_decision" ? "firebird" : null, resultField: "RESULTADO", outcome: type === "end" ? "success" : null };
    onChange({ ...value, nodes: [...value.nodes.map((item) => ({ ...item, configurationSelected: false } as FlowNodeDefinition)), { ...node, configurationSelected: true } as FlowNodeDefinition] });
  }
  function removeNode() { if (!selected || selected.type === "start") return; const remaining = value.nodes.filter((node) => node.nodeKey !== selected.nodeKey).map((node, position) => ({ ...node, position })); onChange({ nodes: remaining, edges: value.edges.filter((edge) => edge.sourceKey !== selected.nodeKey && edge.targetKey !== selected.nodeKey) }); }
  function move(delta: number) { if (!selected) return; const ordered = [...value.nodes].sort((a, b) => a.position - b.position); const index = ordered.findIndex((node) => node.nodeKey === selected.nodeKey); const target = index + delta; if (target < 0 || target >= ordered.length) return; [ordered[index], ordered[target]] = [ordered[target], ordered[index]]; onChange({ ...value, nodes: ordered.map((node, position) => ({ ...node, position })) }); }
  function updateEdge(index: number, patch: Partial<FlowEdgeDefinition>) { const edges = value.edges.map((edge, edgeIndex) => edgeIndex === index ? { ...edge, ...patch } : edge); onChange({ ...value, edges }); }
  function addEdge() { if (!selected) return; const target = value.nodes.find((node) => node.nodeKey !== selected.nodeKey)?.nodeKey; if (!target) return; onChange({ ...value, edges: [...value.edges, { sourceKey: selected.nodeKey, targetKey: target, condition: "always", label: "Próximo", priority: value.edges.filter((edge) => edge.sourceKey === selected.nodeKey).length }] }); }
  const selectedEdges = value.edges.map((edge, index) => ({ edge, index })).filter(({ edge }) => edge.sourceKey === selected?.nodeKey);

  return <div className="flowDesigner">
    <div className="flowToolbar"><strong>Blocos</strong><button type="button" onClick={() => addNode("question")}>+ Pergunta</button><button type="button" onClick={() => addNode("automatic_decision")}>+ Decisão automática</button><button type="button" onClick={() => addNode("action")}>+ Ação</button><button type="button" onClick={() => addNode("observation")}>+ Observação</button><button type="button" onClick={() => addNode("end")}>+ Final</button></div>
    <div className="flowWorkspace">
      <div className="flowCanvas"><div className="flowCanvasHeader"><div><h3>Mapa do fluxo</h3><p>Selecione um bloco para configurar suas propriedades e conectores.</p></div><span>{value.nodes.length} blocos · {value.edges.length} conexões</span></div><div className="flowNodeGrid">{[...value.nodes].sort((a, b) => a.position - b.position).map((node) => { const outgoing = value.edges.filter((edge) => edge.sourceKey === node.nodeKey); return <button type="button" key={node.nodeKey} className={`flowNode flowNode-${node.type} ${node.nodeKey === selected?.nodeKey ? "selected" : ""}`} onClick={() => select(node.nodeKey)}><small>{nodeLabels[node.type]}</small><strong>{node.title}</strong>{outgoing.length ? <span>{outgoing.map((edge) => edge.label || "Próximo").join(" · ")}</span> : node.type === "end" ? <span>{node.outcome === "success" ? "Sucesso" : "Sem sucesso"}</span> : <span className="flowWarning">Sem conexão</span>}</button>; })}</div></div>
      {selected && <aside className="flowInspector"><div className="flowInspectorHeader"><div><small>{nodeLabels[selected.type]}</small><h3>Configurar bloco</h3></div><div><button type="button" onClick={() => move(-1)} aria-label="Mover para cima">↑</button><button type="button" onClick={() => move(1)} aria-label="Mover para baixo">↓</button></div></div><label>Título<input value={selected.title} onChange={(event) => updateNode({ title: event.target.value })} /></label>{selected.type !== "start" && <label>Orientação para o usuário<textarea rows={2} value={selected.description || ""} onChange={(event) => updateNode({ description: event.target.value })} /></label>}
        {selected.type === "start" && <label className="flowCheck"><input type="checkbox" checked={Boolean(selected.automationSource)} onChange={(event) => updateNode(event.target.checked ? { automationSource: "firebird", resultField: "QTDE" } : { automationSource: null, querySql: null, customerResultField: null })} />Validar a venda antes de criar a demanda</label>}
        {(selected.type === "question" || selected.type === "action") && <><label>Tipo de resposta<select value={selected.fieldType || "boolean"} onChange={(event) => updateNode({ fieldType: event.target.value as FlowNodeDefinition["fieldType"], sourceKey: null })}>{fieldTypes.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>{(selected.fieldType === "single_select" || selected.fieldType === "multi_select") && <label>Fonte das opções<select value={selected.sourceKey || ""} onChange={(event) => updateNode({ sourceKey: event.target.value || null })}><option value="">Selecione</option>{sources.map((source) => <option key={source.key} value={source.key}>{source.label}</option>)}</select></label>}<label className="flowCheck"><input type="checkbox" checked={selected.required || false} onChange={(event) => updateNode({ required: event.target.checked })} />Resposta obrigatória</label></>}
        {selected.type === "observation" && <label className="flowCheck"><input type="checkbox" checked={selected.required || false} onChange={(event) => updateNode({ required: event.target.checked })} />Observação obrigatória</label>}
        {(selected.type === "automatic_decision" || (selected.type === "start" && selected.automationSource)) && <><div className="formGrid"><label>Banco<select value={selected.automationSource || "firebird"} onChange={(event) => updateNode({ automationSource: event.target.value as "firebird" | "postgres" })}><option value="firebird">Firebird / Gateway</option><option value="postgres">PostgreSQL</option></select></label><label>Campo da decisão<input value={selected.resultField || "RESULTADO"} onChange={(event) => updateNode({ resultField: event.target.value })} placeholder="QTDE" /></label></div>{selected.type === "start" && <label>Campo do nome do cliente — opcional<input value={selected.customerResultField || ""} onChange={(event) => updateNode({ customerResultField: event.target.value || null })} placeholder="CLIENTE" /></label>}<label>Consulta SELECT<textarea className="flowSql" rows={8} value={selected.querySql || ""} onChange={(event) => updateNode({ querySql: event.target.value })} placeholder="SELECT 1 AS QTDE, C.NOME AS CLIENTE FROM SAIDA S ... WHERE S.IDFILIAL = :idfilial AND S.NUMEROSAIDA = :numerosaida" /></label><p className="queryHelp">A demanda só será criada quando uma conexão corresponder ao resultado. Parâmetros: <code>:idfilial</code>, <code>:numerosaida</code>, <code>:idfuncionario</code> e <code>:categoria</code>.</p></>}
        {selected.type === "end" && <label>Resultado do fluxo<select value={selected.outcome || "success"} onChange={(event) => updateNode({ outcome: event.target.value as "success" | "failure" })}><option value="success">Finalizado com sucesso</option><option value="failure">Finalizado sem sucesso</option></select></label>}
        {selected.type !== "end" && <div className="flowConnections"><div className="fieldsTitle"><div><h3>Conectores de saída</h3><p>Defina para onde o fluxo avança.</p></div><button type="button" onClick={addEdge}>+ Conector</button></div>{selectedEdges.map(({ edge, index }) => <div className="flowConnection" key={index}><label>Quando<select value={edge.condition} onChange={(event) => updateEdge(index, { condition: event.target.value as FlowEdgeDefinition["condition"] })}><option value="always">Sempre</option><option value="equals">Igual a</option><option value="not_equals">Diferente de</option><option value="greater_than">Maior que</option><option value="greater_or_equal">Maior ou igual a</option><option value="less_than">Menor que</option><option value="less_or_equal">Menor ou igual a</option></select></label>{edge.condition !== "always" && <label>Valor esperado<input value={String(edge.conditionValue ?? "")} placeholder="0, Sim, P..." onChange={(event) => updateEdge(index, { conditionValue: parseConditionValue(event.target.value) })} /></label>}<label>Nome<input value={edge.label || ""} onChange={(event) => updateEdge(index, { label: event.target.value })} /></label><label>Próximo bloco<select value={edge.targetKey} onChange={(event) => updateEdge(index, { targetKey: event.target.value })}>{value.nodes.filter((node) => node.nodeKey !== selected.nodeKey).map((node) => <option key={node.nodeKey} value={node.nodeKey}>{node.title}</option>)}</select></label><button type="button" className="removeButton" onClick={() => onChange({ ...value, edges: value.edges.filter((_, edgeIndex) => edgeIndex !== index) })}>×</button></div>)}</div>}
        {selected.type !== "start" && <button type="button" className="secondaryButton dangerButton flowRemoveNode" onClick={removeNode}>Excluir bloco</button>}
      </aside>}
    </div>
  </div>;
}

function parseConditionValue(value: string): string | number | boolean {
  const normalized = value.trim().toLowerCase();
  if (["true", "sim", "s"].includes(normalized)) return true;
  if (["false", "não", "nao", "n"].includes(normalized)) return false;
  if (value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return value;
}
