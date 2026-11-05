"use client";

import { useEffect, useState } from "react";
import { formatDashboardValue, numericDashboardValue, type DashboardDisplayFormat } from "@/lib/dashboard-format";

type Scenario = { id: string; title: string; description: string | null; visualization: "metric" | "bar" | "donut" | "table"; labelField: string | null; valueField: string; labelFormat: DashboardDisplayFormat; valueFormat: DashboardDisplayFormat; columnFormats: Array<{ field: string; format: DashboardDisplayFormat; scope: "summary" | "detail" | "both" }>; color: string; hasDetails: boolean };
type Result = { rows: Record<string, unknown>[]; truncated: boolean; error?: string };

function field(row: Record<string, unknown>, name: string | null) {
  if (!name) return undefined;
  const key = Object.keys(row).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? row[key] : undefined;
}
function formatCell(column: string, value: unknown, scenario: Scenario, scope: "summary" | "detail") {
  const rule = scenario.columnFormats.find((item) => item.field.toLowerCase() === column.toLowerCase() && (item.scope === scope || item.scope === "both"));
  if (rule) return formatDashboardValue(value, rule.format);
  if (column.toLowerCase() === scenario.valueField.toLowerCase()) return formatDashboardValue(value, scenario.valueFormat);
  if (scenario.labelField && column.toLowerCase() === scenario.labelField.toLowerCase()) return formatDashboardValue(value, scenario.labelFormat);
  return String(value ?? "");
}

export function DashboardWidgets({ scenarios }: { scenarios: Scenario[] }) {
  const [results, setResults] = useState<Record<string, Result>>({});
  const [detail, setDetail] = useState<{ scenario: Scenario; rows: Record<string, unknown>[]; truncated: boolean } | null>(null);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all(scenarios.map(async (scenario) => {
      const response = await fetch(`/api/dashboard-scenarios/${scenario.id}`, { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      return [scenario.id, response.ok ? body : { rows: [], truncated: false, error: body.error || "Falha ao carregar." }] as const;
    })).then((entries) => { if (active) setResults(Object.fromEntries(entries)); });
    return () => { active = false; };
  }, [scenarios]);

  async function openDetail(scenario: Scenario, value?: unknown) {
    if (!scenario.hasDetails) return;
    setDetailError("");
    const parameters = new URLSearchParams({ mode: "detail" });
    if (value !== undefined) parameters.set("value", String(value));
    if (scenario.labelField) parameters.set("field", scenario.labelField);
    const response = await fetch(`/api/dashboard-scenarios/${scenario.id}?${parameters}`, { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setDetailError(body.error || "Não foi possível abrir os detalhes."); return; }
    setDetail({ scenario, rows: body.rows || [], truncated: Boolean(body.truncated) });
  }

  if (!scenarios.length) return <div className="emptyState"><span>▦</span><h3>Dashboard preparado para novos cenários</h3><p>O administrador poderá adicionar cards e gráficos ligados ao SonoShowGateway.</p></div>;
  return <>
    <div className="dynamicDashboard">{scenarios.map((scenario) => <DashboardWidget key={scenario.id} scenario={scenario} result={results[scenario.id]} openDetail={openDetail} />)}</div>
    {detailError && <p className="feedbackToast formError" role="alert">{detailError}</p>}
    {detail && <DetailModal {...detail} close={() => setDetail(null)} />}
  </>;
}

function DashboardWidget({ scenario, result, openDetail }: { scenario: Scenario; result?: Result; openDetail: (scenario: Scenario, value?: unknown) => void }) {
  if (!result) return <article className="dashboardWidget loadingWidget"><span>Carregando</span><strong>—</strong></article>;
  if (result.error) return <article className="dashboardWidget errorWidget"><span>{scenario.title}</span><p>{result.error}</p></article>;
  const rows = result.rows;
  if (scenario.visualization === "metric") {
    const value = field(rows[0] || {}, scenario.valueField);
    return <button className="dashboardWidget metricWidget" style={{ "--widget-color": scenario.color } as React.CSSProperties} disabled={!scenario.hasDetails} onClick={() => openDetail(scenario)}><span>{scenario.title}</span><strong>{formatDashboardValue(value, scenario.valueFormat)}</strong><small>{scenario.description || (scenario.hasDetails ? "Clique para ver detalhes" : "Indicador")}</small></button>;
  }
  if (scenario.visualization === "table") return <article className="dashboardWidget tableWidget"><WidgetHeading scenario={scenario} /><MiniTable scenario={scenario} rows={rows} onRow={(row) => openDetail(scenario, field(row, scenario.labelField))} clickable={scenario.hasDetails} /></article>;
  const data = rows.map((row) => {
    const rawLabel = field(row, scenario.labelField);
    return { rawLabel, label: formatDashboardValue(rawLabel ?? "Sem rótulo", scenario.labelFormat), value: numericDashboardValue(field(row, scenario.valueField)) };
  });
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (scenario.visualization === "donut") {
    const colors = [scenario.color, "#f3b447", "#4d8fc7", "#9c6ade", "#d56b6b", "#6b8f71"];
    const gradient = data.map((item, index) => {
      const previous = data.slice(0, index).reduce((sum, entry) => sum + entry.value, 0);
      const start = total ? previous / total * 100 : 0;
      const end = total ? (previous + item.value) / total * 100 : 0;
      return `${colors[index % colors.length]} ${start}% ${end}%`;
    }).join(", ");
    return <article className="dashboardWidget chartWidget"><WidgetHeading scenario={scenario} /><div className="donutLayout"><div className="donutChart" style={{ background: `conic-gradient(${gradient || "#e5ebe8 0 100%"})` }}><strong>{formatDashboardValue(total, scenario.valueFormat)}</strong></div><div className="chartLegend">{data.map((item, index) => <button key={`${item.label}-${index}`} onClick={() => openDetail(scenario, item.rawLabel)} disabled={!scenario.hasDetails}><i style={{ background: colors[index % colors.length] }} /><span>{item.label}</span><strong>{formatDashboardValue(item.value, scenario.valueFormat)}</strong></button>)}</div></div></article>;
  }
  const maximum = Math.max(1, ...data.map((item) => item.value));
  return <article className="dashboardWidget chartWidget"><WidgetHeading scenario={scenario} /><div className="barChart">{data.map((item, index) => <button key={`${item.label}-${index}`} onClick={() => openDetail(scenario, item.rawLabel)} disabled={!scenario.hasDetails}><span>{item.label}</span><i><b style={{ width: `${item.value / maximum * 100}%`, background: scenario.color }} /></i><strong>{formatDashboardValue(item.value, scenario.valueFormat)}</strong></button>)}</div></article>;
}

function WidgetHeading({ scenario }: { scenario: Scenario }) { return <header><div><h3>{scenario.title}</h3><p>{scenario.description}</p></div>{scenario.hasDetails && <small>Detalhes disponíveis</small>}</header>; }
function MiniTable({ scenario, rows, onRow, clickable }: { scenario: Scenario; rows: Record<string, unknown>[]; onRow: (row: Record<string, unknown>) => void; clickable: boolean }) { const columns = rows[0] ? Object.keys(rows[0]).slice(0, 5) : []; return columns.length ? <div className="tableWrap"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.slice(0, 8).map((row, index) => <tr className={clickable ? "clickableRow" : ""} key={index} onClick={() => clickable && onRow(row)}>{columns.map((column) => <td key={column}>{formatCell(column, row[column], scenario, "summary")}</td>)}</tr>)}</tbody></table></div> : <p className="muted">Sem dados para o período.</p>; }

function DetailModal({ scenario, rows, truncated, close }: { scenario: Scenario; rows: Record<string, unknown>[]; truncated: boolean; close: () => void }) {
  const columns = rows[0] ? Object.keys(rows[0]) : [];
  return <div className="modalBackdrop"><section className="builder detailModal" role="dialog" aria-modal="true" aria-labelledby="detail-title"><div className="builderHeader"><div><p className="eyebrow">DETALHAMENTO</p><h2 id="detail-title">{scenario.title}</h2><p className="muted">{rows.length} registro(s){truncated ? " · resultado limitado a 500 linhas" : ""}</p></div><button className="closeButton" onClick={close} aria-label="Fechar detalhes">×</button></div>{columns.length ? <div className="tableWrap detailTable"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column}>{formatCell(column, row[column], scenario, "detail")}</td>)}</tr>)}</tbody></table></div> : <div className="emptyState"><span>✓</span><h3>Nenhum registro encontrado</h3></div>}</section></div>;
}
