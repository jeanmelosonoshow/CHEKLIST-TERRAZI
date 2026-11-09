"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { formatFlowAnswer, type FlowDefinition, type FlowFieldType, type FlowNodeType } from "@/lib/checklist-flow";
import { SaleItemsTable, type SaleItem } from "./SaleItemsTable";

type Option = { value: string; label: string };
type SimNode = { nodeKey: string; type: FlowNodeType; title: string; description?: string | null; fieldType?: FlowFieldType | null; required?: boolean; options: Option[] };
type Step = { nodeKey: string; title: string; answer: unknown; automatic: boolean };
const simulationStorageEvent = "checklist-flow-simulation-change";

function subscribeSimulationStorage(callback: () => void) {
  const listener = () => callback();
  window.addEventListener("storage", listener);
  window.addEventListener(simulationStorageEvent, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(simulationStorageEvent, listener);
  };
}

export function ChecklistFlowSimulator({ flow, storageKey }: { flow: FlowDefinition; storageKey: string }) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState({ branchId: "", saleNumber: "" });
  const [current, setCurrent] = useState<SimNode | null>(null);
  const [history, setHistory] = useState<Step[]>([]);
  const [answer, setAnswer] = useState<unknown>("");
  const [observation, setObservation] = useState("");
  const [outcome, setOutcome] = useState<"success" | "failure" | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [active, setActive] = useState(false);
  const localKey = `checklist-flow-simulation:${storageKey}`;
  const signature = JSON.stringify({ nodes: flow.nodes.map((node) => [node.nodeKey, node.type, node.title]), edges: flow.edges });
  const hasSaved = useSyncExternalStore(subscribeSimulationStorage, () => Boolean(localStorage.getItem(localKey)), () => false);

  useEffect(() => {
    if (!active) return;
    localStorage.setItem(localKey, JSON.stringify({ signature, context, current, history, answer, observation, outcome, customerName, saleItems }));
    window.dispatchEvent(new Event(simulationStorageEvent));
  }, [active, localKey, signature, context, current, history, answer, observation, outcome, customerName, saleItems]);

  function openSimulation() {
    const raw = localStorage.getItem(localKey);
    if (raw) try {
      const saved = JSON.parse(raw);
      if (saved.signature === signature) {
        setContext(saved.context); setCurrent(saved.current); setHistory(saved.history || []); setAnswer(saved.answer ?? "");
        setObservation(saved.observation || ""); setOutcome(saved.outcome || null); setCustomerName(saved.customerName || null); setSaleItems(saved.saleItems || []);
      } else { localStorage.removeItem(localKey); window.dispatchEvent(new Event(simulationStorageEvent)); }
    } catch { localStorage.removeItem(localKey); window.dispatchEvent(new Event(simulationStorageEvent)); }
    setActive(true); setOpen(true);
  }

  function discard() {
    localStorage.removeItem(localKey); window.dispatchEvent(new Event(simulationStorageEvent)); setActive(false); setOpen(false); setCurrent(null); setHistory([]); setOutcome(null);
    setAnswer(""); setObservation(""); setMessage(""); setCustomerName(null); setSaleItems([]);
  }

  async function run(nodeKey?: string) {
    if (!context.branchId || !context.saleNumber) { setMessage("Informe filial e número da saída."); return; }
    setWorking(true); setMessage("");
    const response = await fetch("/api/admin/checklists/simulate", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ flow, ...context, nodeKey, answer, observation }),
    });
    const body = await response.json().catch(() => ({})); setWorking(false);
    if (!response.ok) { setMessage(body.error || "Não foi possível simular esta etapa."); return; }
    setHistory((items) => [...items, body.step]); setCurrent(body.currentNode || null);
    setOutcome(body.outcome || null); setCustomerName((value) => body.customerName || value);
    setSaleItems((items) => body.saleItems?.length ? body.saleItems : items);
    setAnswer(""); setObservation("");
  }

  return <>
    <button type="button" className="flowTestButton" onClick={openSimulation}>▶ {active || hasSaved ? "Continuar teste" : "Testar fluxo"}</button>
    {open && <div className="modalBackdrop flowSimulationBackdrop">
      <section className="builder flowSimulationModal" role="dialog" aria-modal="true" onKeyDown={(event) => { if (event.key === "Enter" && !(event.target instanceof HTMLTextAreaElement)) event.preventDefault(); }}>
        <div className="builderHeader"><div><p className="eyebrow">SIMULAÇÃO SEM GRAVAÇÃO</p><h2>Testar fluxo</h2></div><button type="button" className="closeButton" onClick={() => setOpen(false)}>×</button></div>
        {!current && !history.length && !outcome ? <div className="flowSimulationStart">
          <p className="muted">Informe os dados usados pelas consultas. Nenhuma execução será criada no banco.</p>
          <div className="formGrid"><label>Filial<input value={context.branchId} onChange={(event) => setContext({ ...context, branchId: event.target.value })} /></label><label>Número da saída<input value={context.saleNumber} onChange={(event) => setContext({ ...context, saleNumber: event.target.value })} /></label></div>
          <button type="button" className="primaryButton" disabled={working} onClick={() => run()}>{working ? "Validando…" : "Iniciar simulação"}</button>
        </div> : <>
          <div className="simulationContext"><span>Filial <strong>{context.branchId}</strong></span><span>Saída <strong>{context.saleNumber}</strong></span>{customerName && <span>Cliente <strong>{customerName}</strong></span>}</div>
          <SaleItemsTable items={saleItems} />
          {history.length > 0 && <div className="flowExecutionTimeline">{history.map((step, index) => <div key={`${step.nodeKey}-${index}`}><i>✓</i><span><strong>{step.title}</strong><small>{formatFlowAnswer(step.answer)}{step.automatic ? " · automático" : ""}</small></span></div>)}</div>}
          {outcome ? <div className={`flowOutcome ${outcome}`}><span>✓</span><h3>{outcome === "success" ? "Simulação finalizada com sucesso" : "Simulação finalizada sem sucesso"}</h3><p>Nenhum dado foi gravado.</p></div> : current && <div className="flowCurrentStep"><p className="eyebrow">ETAPA SIMULADA</p><h3>{current.title}</h3>{current.description && <p className="muted">{current.description}</p>}{current.type === "automatic_decision" ? <div className="automaticDecision"><span>⚙</span><p>A consulta será executada ao avançar.</p></div> : current.type === "observation" ? <textarea rows={5} value={observation} onChange={(event) => setObservation(event.target.value)} /> : <SimulatorInput node={current} value={answer} onChange={setAnswer} />}</div>}
          <div className="builderActions"><button type="button" className="textButton dangerButton" onClick={discard}>Descartar teste</button><button type="button" className="secondaryButton" onClick={() => setOpen(false)}>Pausar e fechar</button>{!outcome && current && <button type="button" className="primaryButton" disabled={working} onClick={() => run(current.nodeKey)}>{working ? "Processando…" : current.type === "automatic_decision" ? "Executar decisão" : "Avançar"}</button>}</div>
        </>}
        {message && <p className="formError simulationError" role="alert">{message}</p>}
      </section>
    </div>}
  </>;
}

function SimulatorInput({ node, value, onChange }: { node: SimNode; value: unknown; onChange: (value: unknown) => void }) {
  if (node.fieldType === "boolean") return <div className="booleanChoices"><label><input type="radio" checked={value === true} onChange={() => onChange(true)} />Sim</label><label><input type="radio" checked={value === false} onChange={() => onChange(false)} />Não</label></div>;
  if (node.fieldType === "single_select") return <select value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)}><option value="">Selecione</option>{node.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
  if (node.fieldType === "multi_select") { const selected = Array.isArray(value) ? value as string[] : []; return <div className="multiChoices">{node.options.map((option) => <label key={option.value}><input type="checkbox" checked={selected.includes(option.value)} onChange={(event) => onChange(event.target.checked ? [...selected, option.value] : selected.filter((item) => item !== option.value))} />{option.label}</label>)}</div>; }
  if (node.fieldType === "long_text") return <textarea rows={5} value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} />;
  return <input type={node.fieldType === "number" ? "number" : node.fieldType === "date" ? "date" : "text"} value={typeof value === "string" || typeof value === "number" ? value : ""} onChange={(event) => onChange(node.fieldType === "number" ? event.target.value === "" ? "" : Number(event.target.value) : event.target.value)} />;
}

