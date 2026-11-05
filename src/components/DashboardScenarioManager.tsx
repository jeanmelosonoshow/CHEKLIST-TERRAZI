"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Visualization = "metric" | "bar" | "donut" | "table";
type Scenario = {
  id: string; title: string; description: string | null; visualization: Visualization;
  summarySql: string; detailSql: string | null; labelField: string | null; valueField: string;
  color: string; position: number; active: boolean; version: number; createdAt: string; updatedAt: string;
};
type Draft = Omit<Scenario, "id" | "createdAt" | "updatedAt"> & { id?: string };

const emptyDraft: Draft = {
  title: "", description: "", visualization: "metric", summarySql: "", detailSql: "",
  labelField: "STATUS", valueField: "QUANTIDADE", color: "#126b50", position: 0, active: true, version: 0,
};

export function DashboardScenarioManager({ initialScenarios }: { initialScenarios: Scenario[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<Record<string, unknown>[] | null>(null);
  const [working, setWorking] = useState(false);

  function edit(scenario?: Scenario) {
    setMessage(""); setPreview(null);
    setDraft(scenario ? { ...scenario } : { ...emptyDraft, position: initialScenarios.length });
  }
  function update<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft((current) => current ? { ...current, [key]: value } : current); }

  async function testQuery() {
    if (!draft?.summarySql) return;
    setWorking(true); setMessage(""); setPreview(null);
    const response = await fetch("/api/admin/dashboard-scenarios/preview", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sql: draft.summarySql }),
    });
    const body = await response.json().catch(() => ({}));
    setWorking(false);
    if (!response.ok) { setMessage(body.error || "Não foi possível testar a consulta."); return; }
    setPreview(body.rows || []); setMessage(body.truncated ? "Consulta válida. A prévia foi limitada." : "Consulta executada com sucesso.");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!draft) return;
    setWorking(true); setMessage("");
    const response = await fetch(draft.id ? `/api/admin/dashboard-scenarios/${draft.id}` : "/api/admin/dashboard-scenarios", {
      method: draft.id ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draft),
    });
    const body = await response.json().catch(() => ({}));
    setWorking(false);
    if (!response.ok) { setMessage(body.error || "Não foi possível salvar o cenário."); return; }
    setDraft(null); router.refresh();
  }

  return <>
    <div className="sectionHeading"><div><h2>Consultas configuradas</h2><p className="muted">As consultas são executadas no servidor e nunca são enviadas pelo navegador ao Gateway.</p></div><button className="primaryButton" onClick={() => edit()}>+ Novo cenário</button></div>
    {initialScenarios.length ? <div className="tableWrap responsiveTable"><table><thead><tr><th>Cenário</th><th>Visual</th><th>Ordem</th><th>Situação</th><th>Versão</th><th>Ação</th></tr></thead><tbody>{initialScenarios.map((scenario) => <tr key={scenario.id}>
      <td data-label="Cenário"><strong>{scenario.title}</strong><small>{scenario.description || "Sem descrição"}</small></td>
      <td data-label="Visual">{{ metric: "Indicador", bar: "Barras", donut: "Rosca", table: "Tabela" }[scenario.visualization]}</td>
      <td data-label="Ordem">{scenario.position}</td><td data-label="Situação"><span className={`status ${scenario.active ? "published" : "archived"}`}>{scenario.active ? "Ativo" : "Inativo"}</span></td>
      <td data-label="Versão">{scenario.version}</td><td data-label="Ação"><button className="secondaryButton" onClick={() => edit(scenario)}>Editar</button></td>
    </tr>)}</tbody></table></div> : <div className="emptyState"><span>▦</span><h3>Nenhum cenário configurado</h3><p>Crie o primeiro indicador do dashboard.</p></div>}

    {draft && <div className="modalBackdrop" role="presentation"><section className="builder dashboardBuilder" role="dialog" aria-modal="true" aria-labelledby="scenario-title">
      <div className="builderHeader"><div><p className="eyebrow">DASHBOARD DINÂMICO</p><h2 id="scenario-title">{draft.id ? "Editar cenário" : "Novo cenário"}</h2></div><button className="closeButton" onClick={() => setDraft(null)} aria-label="Fechar">×</button></div>
      <form onSubmit={save}>
        <div className="formGrid"><label>Título<input value={draft.title} onChange={(e) => update("title", e.target.value)} required minLength={3} /></label><label>Descrição<input value={draft.description || ""} onChange={(e) => update("description", e.target.value)} /></label></div>
        <div className="scenarioOptions"><label>Visualização<select value={draft.visualization} onChange={(e) => update("visualization", e.target.value as Visualization)}><option value="metric">Indicador numérico</option><option value="bar">Gráfico de barras</option><option value="donut">Gráfico de rosca</option><option value="table">Tabela resumida</option></select></label><label>Campo de rótulo<input value={draft.labelField || ""} onChange={(e) => update("labelField", e.target.value)} placeholder="Ex.: STATUS" /></label><label>Campo de valor<input value={draft.valueField} onChange={(e) => update("valueField", e.target.value)} placeholder="Ex.: QUANTIDADE" required /></label><label>Cor<input type="color" value={draft.color} onChange={(e) => update("color", e.target.value)} /></label><label>Ordem<input type="number" min={0} value={draft.position} onChange={(e) => update("position", Number(e.target.value))} /></label><label className="checkLabel scenarioActive"><input type="checkbox" checked={draft.active} onChange={(e) => update("active", e.target.checked)} />Ativo</label></div>
        <label className="sqlField">Consulta do card ou gráfico<textarea rows={9} spellCheck={false} value={draft.summarySql} onChange={(e) => update("summarySql", e.target.value)} required placeholder="SELECT COUNT(*) AS QUANTIDADE FROM VENDA WHERE IDFILIAL = :idfilial" /></label>
        <label className="sqlField">Consulta de detalhe ao clicar — opcional<textarea rows={8} spellCheck={false} value={draft.detailSql || ""} onChange={(e) => update("detailSql", e.target.value)} placeholder="SELECT IDFILIAL, NUMEROVENDA, CLIENTE FROM VENDA WHERE STATUS = :detalhe_valor" /></label>
        <p className="queryHelp">Parâmetros disponíveis: <code>:idfilial</code>, <code>:idfuncionario</code>, <code>:categoria</code>, <code>:detalhe_valor</code>, <code>:detalhe_campo</code> e <code>:detalhe_serie</code>.</p>
        {message && <p className={preview ? "formSuccess" : "formError"} role="status">{message}</p>}
        {preview && <QueryPreview rows={preview} />}
        <div className="builderActions"><button type="button" className="secondaryButton" disabled={working} onClick={testQuery}>Testar consulta</button><button type="button" className="textButton" onClick={() => setDraft(null)}>Cancelar</button><button className="primaryButton" disabled={working}>{working ? "Processando…" : "Salvar cenário"}</button></div>
      </form>
    </section></div>}
  </>;
}

function QueryPreview({ rows }: { rows: Record<string, unknown>[] }) {
  const columns = rows[0] ? Object.keys(rows[0]) : [];
  return <div className="queryPreview"><strong>Prévia · {rows.length} linha(s)</strong>{columns.length ? <div className="tableWrap"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.slice(0, 5).map((row, index) => <tr key={index}>{columns.map((column) => <td key={column}>{String(row[column] ?? "")}</td>)}</tr>)}</tbody></table></div> : <p className="muted">A consulta não retornou linhas.</p>}</div>;
}
