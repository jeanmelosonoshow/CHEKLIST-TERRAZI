"use client";

import { useState } from "react";
import { identifyStage, stageDefinitions, stageStatuses, type StageKey, type StageProcessRow, type StageStatus } from "@/lib/stages";

function StageStatusBadge({ status }: { status: StageStatus }) {
  const definition = stageStatuses[status];
  return <span className={`stageStatus stageStatus-${definition.tone}`}><span aria-hidden="true" className="stageStatusDot" />{definition.label}</span>;
}

export function StagesBoard({ rows }: { rows: StageProcessRow[] }) {
  const [sale, setSale] = useState(""); const [customer, setCustomer] = useState(""); const [branch, setBranch] = useState(""); const [stage, setStage] = useState<StageKey | "">("");
  const filtered = rows.filter((row) => matches(row.sale, sale) && matches(row.customerName, customer) && matches(row.branch, branch) && (!stage || identifyStage(row.currentStage || "") === stage));
  return <>
    <div className="stageLegend" aria-label="Legenda dos status">
      {Object.entries(stageStatuses).map(([status, definition]) => <StageStatusBadge status={status as StageStatus} key={definition.label} />)}
    </div>

    {rows.length ? <><div className="stageFilters"><label>Etapa<select value={stage} onChange={(event) => setStage(event.target.value as StageKey | "")}><option value="">Todas as etapas</option>{stageDefinitions.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><label>Filial<input value={branch} onChange={(event) => setBranch(event.target.value)} placeholder="Ex.: 29" /></label><label>Número da saída<input value={sale} onChange={(event) => setSale(event.target.value)} placeholder="Ex.: 5351" /></label><label>Cliente<input value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="Nome do cliente" /></label><span>{filtered.length} venda(s)</span></div><div className="tableWrap responsiveTable stagesTable">
      <table>
        <thead><tr><th>Filial · Venda · Cliente</th>{stageDefinitions.map((stage) => <th key={stage.key}>{stage.label}</th>)}</tr></thead>
        <tbody>{filtered.map((row) => <tr key={row.id}>
          <td data-label="Venda"><strong>{row.customerName || "Cliente não identificado"}</strong><small>Filial {row.branch} · Saída {row.sale}{row.checklistTitle ? ` · ${row.checklistTitle}` : ""}</small>{row.currentStage && <small className="currentStageText">Atual: {row.currentStage}</small>}</td>
          {stageDefinitions.map((stage) => <td data-label={stage.label} key={stage.key}><StageStatusBadge status={row.stages[stage.key]} /></td>)}
        </tr>)}</tbody>
      </table>
    </div>{!filtered.length && <div className="compactEmpty emptyState"><span>⌕</span><h3>Nenhuma venda encontrada</h3><p>Revise os filtros informados.</p></div>}</> : <div className="stagesEmpty">
      <div><p className="eyebrow">MOLDE INICIAL</p><h2>Etapas do processo</h2><p className="muted">A estrutura está pronta para receber uma linha por filial, venda e cliente quando a origem e o salvamento dos dados forem definidos.</p></div>
      <ol className="stageTemplate">{stageDefinitions.map((stage, index) => <li key={stage.key}><span>{index + 1}</span><strong>{stage.label}</strong></li>)}</ol>
    </div>}
  </>;
}

function matches(value: string, search: string) { const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); return normalize(search).split(/\s+/).filter(Boolean).every((token) => normalize(value).includes(token)); }
