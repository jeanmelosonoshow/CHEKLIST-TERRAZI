"use client";

import { useState } from "react";
import type { FlowDefinition, FlowFieldType, FlowNodeType } from "@/lib/checklist-flow";

type Option = { value: string; label: string };
type SimNode = { nodeKey: string; type: FlowNodeType; title: string; description?: string | null; fieldType?: FlowFieldType | null; required?: boolean; options: Option[] };
type Step = { nodeKey: string; title: string; answer: unknown; automatic: boolean };

export function ChecklistFlowSimulator({ flow }: { flow: FlowDefinition }) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState({ branchId: "", saleNumber: "" });
  const [current, setCurrent] = useState<SimNode | null>(null);
  const [history, setHistory] = useState<Step[]>([]);
  const [answer, setAnswer] = useState<unknown>("");
  const [observation, setObservation] = useState("");
  const [outcome, setOutcome] = useState<"success" | "failure" | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  function close() {
    setOpen(false); setCurrent(null); setHistory([]); setOutcome(null);
    setAnswer(""); setObservation(""); setMessage(""); setCustomerName(null);
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
    setAnswer(""); setObservation("");
  }

  return <>
    <button type="button" className="flowTestButton" onClick={() => setOpen(true)}>▶ Testar fluxo</button>
    {open && <div className="modalBackdrop flowSimulationBackdrop">
      <section className="builder flowSimulationModal" role="dialog" aria-modal="true" onKeyDown={(event) => { if (event.key === "Enter" && !(event.target instanceof HTMLTextAreaElement)) event.preventDefault(); }}>
        <div className="builderHeader"><div><p className="eyebrow">SIMULAÇÃO SEM GRAVAÇÃO</p><h2>Testar fluxo</h2></div><button type="button" className="closeButton" onClick={close}>×</button></div>
        {!current && !history.length && !outcome ? <div className="flowSimulationStart">
          <p className="muted">Informe os dados usados pelas consultas. Nenhuma execução será criada no banco.</p>
          <div className="formGrid"><label>Filial<input value={context.branchId} onChange={(event) => setContext({ ...context, branchId: event.target.value })} /></label><label>Número da saída<input value={context.saleNumber} onChange={(event) => setContext({ ...context, saleNumber: event.target.value })} /></label></div>
          <button type="button" className="primaryButton" disabled={working} onClick={() => run()}>{working ? "Validando…" : "Iniciar simulação"}</button>
        </div> : <>
          <div className="simulationContext"><span>Filial <strong>{context.branchId}</strong></span><span>Saída <strong>{context.saleNumber}</strong></span>{customerName && <span>Cliente <strong>{customerName}</strong></span>}</div>
          {history.length > 0 && <div className="flowExecutionTimeline">{history.map((step, index) => <div key={`${step.nodeKey}-${index}`}><i>✓</i><span><strong>{step.title}</strong><small>{displayAnswer(step.answer)}{step.automatic ? " · automático" : ""}</small></span></div>)}</div>}
          {outcome ? <div className={`flowOutcome ${outcome}`}><span>✓</span><h3>{outcome === "success" ? "Simulação finalizada com sucesso" : "Simulação finalizada sem sucesso"}</h3><p>Nenhum dado foi gravado.</p></div> : current && <div className="flowCurrentStep"><p className="eyebrow">ETAPA SIMULADA</p><h3>{current.title}</h3>{current.description && <p className="muted">{current.description}</p>}{current.type === "automatic_decision" ? <div className="automaticDecision"><span>⚙</span><p>A consulta será executada ao avançar.</p></div> : current.type === "observation" ? <textarea rows={5} value={observation} onChange={(event) => setObservation(event.target.value)} /> : <SimulatorInput node={current} value={answer} onChange={setAnswer} />}</div>}
          <div className="builderActions"><button type="button" className="textButton" onClick={close}>Encerrar teste</button>{!outcome && current && <button type="button" className="primaryButton" disabled={working} onClick={() => run(current.nodeKey)}>{working ? "Processando…" : current.type === "automatic_decision" ? "Executar decisão" : "Avançar"}</button>}</div>
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

function displayAnswer(value: unknown) { if (value === true) return "Sim"; if (value === false) return "Não"; if (Array.isArray(value)) return value.join(", "); return value === undefined || value === null || value === "" ? "Concluído" : String(value); }
