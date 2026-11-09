"use client";

import { useRef, useState, type PointerEvent } from "react";
import type { FlowDefinition, FlowEdgeDefinition, FlowNodeDefinition, FlowNodeType, FlowPort } from "@/lib/checklist-flow";
import { ChecklistFlowSimulator } from "./ChecklistFlowSimulator";

const nodeLabels: Record<FlowNodeType, string> = { start: "Início", question: "Pergunta", automatic_decision: "Decisão automática", action: "Ação / confirmação", observation: "Observação", end: "Encerramento" };
const fieldTypes = [["short_text", "Texto curto"], ["long_text", "Texto longo"], ["number", "Número"], ["date", "Data"], ["boolean", "Sim / Não"], ["single_select", "Seleção única"], ["multi_select", "Seleção múltipla"]] as const;
const portOptions: Array<[FlowPort, string]> = [["top", "Topo"], ["right", "Direita"], ["bottom", "Base"], ["left", "Esquerda"]];
const nodeWidth = 230; const nodeHeight = 128;

function portPoint(node: FlowNodeDefinition, port: FlowPort) {
  const x = node.x ?? 0; const y = node.y ?? 0;
  if (port === "top") return { x: x + nodeWidth / 2, y, dx: 0, dy: -1 };
  if (port === "bottom") return { x: x + nodeWidth / 2, y: y + nodeHeight, dx: 0, dy: 1 };
  if (port === "left") return { x, y: y + nodeHeight / 2, dx: -1, dy: 0 };
  return { x: x + nodeWidth, y: y + nodeHeight / 2, dx: 1, dy: 0 };
}

export function createDefaultFlow(): FlowDefinition {
  return {
    nodes: [
      { nodeKey: "inicio", type: "start", title: "Início", position: 0, x: 40, y: 80 },
      { nodeKey: "pergunta_inicial", type: "question", title: "Nova pergunta", fieldType: "boolean", required: true, position: 1, x: 340, y: 80 },
      { nodeKey: "final_sucesso", type: "end", title: "Finalizado com sucesso", outcome: "success", position: 2, x: 640, y: 20 },
      { nodeKey: "final_sem_sucesso", type: "end", title: "Finalizado sem sucesso", outcome: "failure", position: 3, x: 640, y: 190 },
    ],
    edges: [
      { sourceKey: "inicio", targetKey: "pergunta_inicial", condition: "always", label: "Começar", sourcePort: "right", targetPort: "left", priority: 0 },
      { sourceKey: "pergunta_inicial", targetKey: "final_sucesso", condition: "equals", conditionValue: true, label: "Sim", sourcePort: "right", targetPort: "left", priority: 0 },
      { sourceKey: "pergunta_inicial", targetKey: "final_sem_sucesso", condition: "equals", conditionValue: false, label: "Não", sourcePort: "right", targetPort: "left", priority: 1 },
    ],
  };
}

export function ChecklistFlowDesigner({ value, onChange, sources, simulationKey }: { value: FlowDefinition; onChange: (flow: FlowDefinition) => void; sources: { key: string; label: string }[]; simulationKey: string }) {
  const [selectedEdgeIndex, setSelectedEdgeIndex] = useState<number | null>(null);
  const selectedKey = value.nodes.find((node) => node.configurationSelected)?.nodeKey ?? value.nodes[0]?.nodeKey;
  const selected = value.nodes.find((node) => node.nodeKey === selectedKey) ?? value.nodes[0];
  function select(nodeKey: string) { onChange({ ...value, nodes: value.nodes.map((node) => ({ ...node, configurationSelected: node.nodeKey === nodeKey } as FlowNodeDefinition)) }); }
  function updateNode(patch: Partial<FlowNodeDefinition>) { if (!selected) return; onChange({ ...value, nodes: value.nodes.map((node) => node.nodeKey === selected.nodeKey ? { ...node, ...patch } : node) }); }
  function addNode(type: Exclude<FlowNodeType, "start">) {
    const key = `${type}_${crypto.randomUUID().slice(0, 8)}`;
    const node: FlowNodeDefinition = { nodeKey: key, type, title: nodeLabels[type], position: value.nodes.length, x: 40 + (value.nodes.length % 3) * 300, y: 80 + Math.floor(value.nodes.length / 3) * 170, required: type === "observation", fieldType: type === "question" ? "boolean" : type === "action" ? "boolean" : null, automationSource: type === "automatic_decision" ? "firebird" : null, resultField: "RESULTADO", outcome: type === "end" ? "success" : null };
    onChange({ ...value, nodes: [...value.nodes.map((item) => ({ ...item, configurationSelected: false } as FlowNodeDefinition)), { ...node, configurationSelected: true } as FlowNodeDefinition] });
  }
  function removeNode() { if (!selected || selected.type === "start") return; const remaining = value.nodes.filter((node) => node.nodeKey !== selected.nodeKey).map((node, position) => ({ ...node, position })); onChange({ nodes: remaining, edges: value.edges.filter((edge) => edge.sourceKey !== selected.nodeKey && edge.targetKey !== selected.nodeKey) }); }
  function move(delta: number) { if (!selected) return; const ordered = [...value.nodes].sort((a, b) => a.position - b.position); const index = ordered.findIndex((node) => node.nodeKey === selected.nodeKey); const target = index + delta; if (target < 0 || target >= ordered.length) return; [ordered[index], ordered[target]] = [ordered[target], ordered[index]]; onChange({ ...value, nodes: ordered.map((node, position) => ({ ...node, position })) }); }
  function updateEdge(index: number, patch: Partial<FlowEdgeDefinition>) { const edges = value.edges.map((edge, edgeIndex) => edgeIndex === index ? { ...edge, ...patch } : edge); onChange({ ...value, edges }); }
  function addEdge() { if (!selected) return; const target = value.nodes.find((node) => node.nodeKey !== selected.nodeKey)?.nodeKey; if (!target) return; setSelectedEdgeIndex(value.edges.length); onChange({ ...value, edges: [...value.edges, { sourceKey: selected.nodeKey, targetKey: target, condition: "always", label: "Próximo", sourcePort: "right", targetPort: "left", priority: value.edges.filter((edge) => edge.sourceKey === selected.nodeKey).length }] }); }
  const selectedEdges = value.edges.map((edge, index) => ({ edge, index })).filter(({ edge }) => edge.sourceKey === selected?.nodeKey);
  const activeEdgeIndex = selectedEdgeIndex !== null && selectedEdges.some(({ index }) => index === selectedEdgeIndex) ? selectedEdgeIndex : selectedEdges[0]?.index ?? null;
  const activeEdge = activeEdgeIndex === null ? null : value.edges[activeEdgeIndex];
  const positioned = [...value.nodes].sort((a, b) => a.position - b.position).map((node, index) => ({ ...node, x: node.x ?? 40 + (index % 3) * 300, y: node.y ?? 80 + Math.floor(index / 3) * 170 }));
  const positions = new Map(positioned.map((node) => [node.nodeKey, node]));
  const [drag, setDrag] = useState<{ key: string; pointerX: number; pointerY: number; x: number; y: number } | null>(null);
  const [endpointDrag, setEndpointDrag] = useState<{ edgeIndex: number; end: "source" | "target"; x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ pointerId: number; x: number; y: number; left: number; top: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const canvasWidth = Math.max(1800, ...positioned.map((node) => (node.x ?? 0) + 520));
  const canvasHeight = Math.max(1200, ...positioned.map((node) => (node.y ?? 0) + 360));
  function moveDraggedNode(event: PointerEvent<HTMLButtonElement>) {
    if (!drag || drag.key !== event.currentTarget.dataset.nodeKey) return;
    const x = Math.max(0, drag.x + (event.clientX - drag.pointerX) / zoom); const y = Math.max(0, drag.y + (event.clientY - drag.pointerY) / zoom);
    onChange({ ...value, nodes: value.nodes.map((node) => node.nodeKey === drag.key ? { ...node, x, y } : node) });
  }
  function changeZoom(next: number) { setZoom(Math.min(1.5, Math.max(.5, next))); }
  function choosePort(nodeKey: string, port: FlowPort) {
    if (activeEdgeIndex === null) return;
    const edge = value.edges[activeEdgeIndex];
    if (edge.sourceKey === nodeKey) updateEdge(activeEdgeIndex, { sourcePort: port });
    else if (edge.targetKey === nodeKey) updateEdge(activeEdgeIndex, { targetPort: port });
  }
  function canvasPoint(event: PointerEvent<SVGCircleElement>) {
    const rect = gridRef.current?.getBoundingClientRect();
    return rect ? { x: (event.clientX - rect.left) / zoom, y: (event.clientY - rect.top) / zoom } : { x: 0, y: 0 };
  }
  function startEndpointDrag(event: PointerEvent<SVGCircleElement>, edgeIndex: number, end: "source" | "target") {
    event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedEdgeIndex(edgeIndex); setEndpointDrag({ edgeIndex, end, ...canvasPoint(event) });
  }
  function moveEndpointDrag(event: PointerEvent<SVGCircleElement>) {
    if (!endpointDrag) return; setEndpointDrag({ ...endpointDrag, ...canvasPoint(event) });
  }
  function finishEndpointDrag(event: PointerEvent<SVGCircleElement>) {
    if (!endpointDrag) return;
    const edge = value.edges[endpointDrag.edgeIndex]; const nodeKey = endpointDrag.end === "source" ? edge.sourceKey : edge.targetKey;
    const node = positions.get(nodeKey); const point = canvasPoint(event);
    if (node) {
      const nearest = portOptions.map(([port]) => ({ port, point: portPoint(node, port) })).sort((a, b) => Math.hypot(a.point.x - point.x, a.point.y - point.y) - Math.hypot(b.point.x - point.x, b.point.y - point.y))[0].port;
      updateEdge(endpointDrag.edgeIndex, endpointDrag.end === "source" ? { sourcePort: nearest } : { targetPort: nearest });
    }
    setEndpointDrag(null);
  }
  function centerSelected() {
    if (!selected || !viewportRef.current) return;
    const node = positions.get(selected.nodeKey); if (!node) return;
    viewportRef.current.scrollTo({ left: Math.max(0, (node.x ?? 0) * zoom - viewportRef.current.clientWidth / 2 + nodeWidth * zoom / 2), top: Math.max(0, (node.y ?? 0) * zoom - viewportRef.current.clientHeight / 2 + nodeHeight * zoom / 2), behavior: "smooth" });
  }

  return <div className="flowDesigner">
    <div className="flowToolbar"><strong>Blocos</strong><button type="button" onClick={() => addNode("question")}>+ Pergunta</button><button type="button" onClick={() => addNode("automatic_decision")}>+ Decisão automática</button><button type="button" onClick={() => addNode("action")}>+ Ação</button><button type="button" onClick={() => addNode("observation")}>+ Observação</button><button type="button" onClick={() => addNode("end")}>+ Final</button><ChecklistFlowSimulator flow={value} storageKey={simulationKey} /></div>
    <div className="flowWorkspace">
      <div className="flowCanvas"><div className="flowCanvasHeader"><div><h3>Mapa do fluxo</h3><p>Selecione uma seta e arraste suas alças até outra porta do bloco.</p></div><div className="flowCanvasControls"><span>{value.nodes.length} blocos · {value.edges.length} conexões</span><button type="button" onClick={() => changeZoom(zoom - .1)} aria-label="Diminuir zoom">−</button><b>{Math.round(zoom * 100)}%</b><button type="button" onClick={() => changeZoom(zoom + .1)} aria-label="Aumentar zoom">+</button><button type="button" onClick={centerSelected}>Centralizar bloco</button></div></div><div ref={viewportRef} className={`flowCanvasViewport ${pan ? "panning" : ""}`} onPointerDown={(event) => { if ((event.target as HTMLElement).closest(".flowNode, .flowConnectorHit, .flowConnectorHandle")) return; event.currentTarget.setPointerCapture(event.pointerId); setPan({ pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop }); }} onPointerMove={(event) => { if (!pan || pan.pointerId !== event.pointerId) return; event.currentTarget.scrollLeft = pan.left - (event.clientX - pan.x); event.currentTarget.scrollTop = pan.top - (event.clientY - pan.y); }} onPointerUp={() => setPan(null)} onPointerCancel={() => setPan(null)}><div className="flowCanvasStage" style={{ width: canvasWidth * zoom, height: canvasHeight * zoom }}><div ref={gridRef} className="flowNodeGrid" style={{ width: canvasWidth, height: canvasHeight, transform: `scale(${zoom})` }}><svg className="flowConnectors" width={canvasWidth} height={canvasHeight}><defs><marker id="flow-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" /></marker></defs>{value.edges.map((edge, index) => { const source = positions.get(edge.sourceKey); const target = positions.get(edge.targetKey); if (!source || !target) return null; const sourcePort = portPoint(source, edge.sourcePort || "right"); const targetPort = portPoint(target, edge.targetPort || "left"); const start = endpointDrag?.edgeIndex === index && endpointDrag.end === "source" ? { ...sourcePort, x: endpointDrag.x, y: endpointDrag.y } : sourcePort; const end = endpointDrag?.edgeIndex === index && endpointDrag.end === "target" ? { ...targetPort, x: endpointDrag.x, y: endpointDrag.y } : targetPort; const distance = Math.max(65, Math.hypot(end.x - start.x, end.y - start.y) * .35); const c1x = start.x + start.dx * distance; const c1y = start.y + start.dy * distance; const c2x = end.x + end.dx * distance; const c2y = end.y + end.dy * distance; const path = `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`; return <g key={`${edge.sourceKey}-${edge.targetKey}-${index}`}><path className={activeEdgeIndex === index ? "selected" : ""} d={path} markerEnd="url(#flow-arrow)" /><path className="flowConnectorHit" d={path} onPointerDown={(event) => { event.stopPropagation(); select(edge.sourceKey); setSelectedEdgeIndex(index); }} />{activeEdgeIndex === index && <><circle className="flowConnectorHandle source" cx={start.x} cy={start.y} r="7" onPointerDown={(event) => startEndpointDrag(event, index, "source")} onPointerMove={moveEndpointDrag} onPointerUp={finishEndpointDrag} onPointerCancel={() => setEndpointDrag(null)} /><circle className="flowConnectorHandle target" cx={end.x} cy={end.y} r="7" onPointerDown={(event) => startEndpointDrag(event, index, "target")} onPointerMove={moveEndpointDrag} onPointerUp={finishEndpointDrag} onPointerCancel={() => setEndpointDrag(null)} /></>}<text x={(start.x + end.x) / 2} y={(start.y + end.y) / 2 - 7}>{edge.label || "Próximo"}</text></g>; })}</svg>{positioned.map((node) => { const outgoing = value.edges.filter((edge) => edge.sourceKey === node.nodeKey); const usedPorts = new Set<FlowPort>([...outgoing.map((edge) => edge.sourcePort || "right"), ...value.edges.filter((edge) => edge.targetKey === node.nodeKey).map((edge) => edge.targetPort || "left")]); return <button type="button" key={node.nodeKey} data-node-key={node.nodeKey} style={{ left: node.x, top: node.y }} className={`flowNode flowNode-${node.type} ${node.nodeKey === selected?.nodeKey ? "selected" : ""} ${drag?.key === node.nodeKey ? "dragging" : ""}`} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDrag({ key: node.nodeKey, pointerX: event.clientX, pointerY: event.clientY, x: node.x ?? 0, y: node.y ?? 0 }); select(node.nodeKey); }} onPointerMove={moveDraggedNode} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}>{portOptions.map(([port, label]) => { const chosen = activeEdge && ((activeEdge.sourceKey === node.nodeKey && (activeEdge.sourcePort || "right") === port) || (activeEdge.targetKey === node.nodeKey && (activeEdge.targetPort || "left") === port)); return <i key={port} title={`${label}: clique para usar esta porta`} className={`flowPort flowPort-${port} ${usedPorts.has(port) ? "active" : ""} ${chosen ? "chosen" : ""}`} onPointerDown={(event) => { event.stopPropagation(); choosePort(node.nodeKey, port); }} />; })}<small>{nodeLabels[node.type]}</small><strong>{node.title}</strong>{outgoing.length ? <span>{outgoing.map((edge) => edge.label || "Próximo").join(" · ")}</span> : node.type === "end" ? <span>{node.outcome === "success" ? "Sucesso" : "Sem sucesso"}</span> : <span className="flowWarning">Sem conexão</span>}</button>; })}</div></div></div></div>
      {selected && <aside className="flowInspector"><div className="flowInspectorHeader"><div><small>{nodeLabels[selected.type]}</small><h3>Configurar bloco</h3></div><div><button type="button" onClick={() => move(-1)} aria-label="Mover para cima">↑</button><button type="button" onClick={() => move(1)} aria-label="Mover para baixo">↓</button></div></div><label>Título<input value={selected.title} onChange={(event) => updateNode({ title: event.target.value })} /></label>{selected.type !== "start" && <label>Orientação para o usuário<textarea rows={2} value={selected.description || ""} onChange={(event) => updateNode({ description: event.target.value })} /></label>}
        {selected.type === "start" && <label className="flowCheck"><input type="checkbox" checked={Boolean(selected.automationSource)} onChange={(event) => updateNode(event.target.checked ? { automationSource: "firebird", resultField: "VENDA_EXISTE" } : { automationSource: null, querySql: null, customerResultField: null, productCodeField: null, productDescriptionField: null, productQuantityField: null })} />Validar a venda antes de criar a demanda</label>}
        {(selected.type === "question" || selected.type === "action") && <><label>Tipo de resposta<select value={selected.fieldType || "boolean"} onChange={(event) => updateNode({ fieldType: event.target.value as FlowNodeDefinition["fieldType"], sourceKey: null })}>{fieldTypes.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>{(selected.fieldType === "single_select" || selected.fieldType === "multi_select") && <label>Fonte das opções<select value={selected.sourceKey || ""} onChange={(event) => updateNode({ sourceKey: event.target.value || null })}><option value="">Selecione</option>{sources.map((source) => <option key={source.key} value={source.key}>{source.label}</option>)}</select></label>}<label className="flowCheck"><input type="checkbox" checked={selected.required || false} onChange={(event) => updateNode({ required: event.target.checked })} />Resposta obrigatória</label></>}
        {selected.type === "observation" && <label className="flowCheck"><input type="checkbox" checked={selected.required || false} onChange={(event) => updateNode({ required: event.target.checked })} />Observação obrigatória</label>}
        {(selected.type === "automatic_decision" || (selected.type === "start" && selected.automationSource)) && <><div className="formGrid"><label>Banco<select value={selected.automationSource || "firebird"} onChange={(event) => updateNode({ automationSource: event.target.value as "firebird" | "postgres" })}><option value="firebird">Firebird / Gateway</option><option value="postgres">PostgreSQL</option></select></label><label>Campo da decisão<input value={selected.resultField || "RESULTADO"} onChange={(event) => updateNode({ resultField: event.target.value })} placeholder="VENDA_EXISTE" /></label></div>{selected.type === "start" && <><label>Campo do nome do cliente — opcional<input value={selected.customerResultField || ""} onChange={(event) => updateNode({ customerResultField: event.target.value || null })} placeholder="CLIENTE" /></label><div className="productMappingGrid"><label>Campo código<input value={selected.productCodeField || ""} onChange={(event) => updateNode({ productCodeField: event.target.value || null })} placeholder="CODIGO" /></label><label>Campo descrição<input value={selected.productDescriptionField || ""} onChange={(event) => updateNode({ productDescriptionField: event.target.value || null })} placeholder="PRODUTO" /></label><label>Campo quantidade<input value={selected.productQuantityField || ""} onChange={(event) => updateNode({ productQuantityField: event.target.value || null })} placeholder="QTDE" /></label></div></>}<label>Consulta SELECT<textarea className="flowSql" rows={8} value={selected.querySql || ""} onChange={(event) => updateNode({ querySql: event.target.value })} placeholder="SELECT 1 AS VENDA_EXISTE, C.NOME AS CLIENTE, I.CODIGO, I.DESCRICAO AS PRODUTO, I.QTDE FROM ... WHERE S.IDFILIAL = :idfilial AND S.NUMEROSAIDA = :numerosaida" /></label><p className="queryHelp">A demanda só será criada quando uma conexão corresponder ao resultado. Para exibir produtos, a consulta deve retornar uma linha por item. Parâmetros: <code>:idfilial</code>, <code>:numerosaida</code>, <code>:idfuncionario</code> e <code>:categoria</code>.</p></>}
        {selected.type === "end" && <label>Resultado do fluxo<select value={selected.outcome || "success"} onChange={(event) => updateNode({ outcome: event.target.value as "success" | "failure" })}><option value="success">Finalizado com sucesso</option><option value="failure">Finalizado sem sucesso</option></select></label>}
        {selected.type !== "end" && <div className="flowConnections"><div className="fieldsTitle"><div><h3>Conectores de saída</h3><p>Selecione um conector para editá-lo também no gráfico.</p></div><button type="button" onClick={addEdge}>+ Conector</button></div>{selectedEdges.map(({ edge, index }) => <div className={`flowConnection ${activeEdgeIndex === index ? "selected" : ""}`} key={index} onPointerDown={() => setSelectedEdgeIndex(index)}><label>Quando<select value={edge.condition} onChange={(event) => updateEdge(index, { condition: event.target.value as FlowEdgeDefinition["condition"] })}><option value="always">Sempre</option><option value="equals">Igual a</option><option value="not_equals">Diferente de</option><option value="greater_than">Maior que</option><option value="greater_or_equal">Maior ou igual a</option><option value="less_than">Menor que</option><option value="less_or_equal">Menor ou igual a</option></select></label>{edge.condition !== "always" && <label>Valor esperado<input value={String(edge.conditionValue ?? "")} placeholder="0, Sim, P..." onChange={(event) => updateEdge(index, { conditionValue: parseConditionValue(event.target.value) })} /></label>}<label>Nome<input value={edge.label || ""} onChange={(event) => updateEdge(index, { label: event.target.value })} /></label><label>Próximo bloco<select value={edge.targetKey} onChange={(event) => updateEdge(index, { targetKey: event.target.value })}>{value.nodes.filter((node) => node.nodeKey !== selected.nodeKey).map((node) => <option key={node.nodeKey} value={node.nodeKey}>{node.title}</option>)}</select></label><label>Seta sai pela<select value={edge.sourcePort || "right"} onChange={(event) => updateEdge(index, { sourcePort: event.target.value as FlowPort })}>{portOptions.map(([port, label]) => <option key={port} value={port}>{label}</option>)}</select></label><label>Seta entra pela<select value={edge.targetPort || "left"} onChange={(event) => updateEdge(index, { targetPort: event.target.value as FlowPort })}>{portOptions.map(([port, label]) => <option key={port} value={port}>{label}</option>)}</select></label><button type="button" className="removeButton" onClick={() => onChange({ ...value, edges: value.edges.filter((_, edgeIndex) => edgeIndex !== index) })}>×</button></div>)}</div>}
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
