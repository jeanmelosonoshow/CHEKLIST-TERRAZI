"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type SourceType = "synchronized" | "static" | "postgres" | "firebird";
type StaticOption = { value: string; label: string };
type Source = {
  key: string; label: string; description: string | null; active: boolean; sourceType: SourceType;
  querySql: string | null; resultValueField: string; resultLabelField: string; staticOptions: StaticOption[];
  lastSyncedAt: string | null; createdAt: string; updatedAt: string;
};
type Draft = Omit<Source, "sourceType" | "lastSyncedAt" | "createdAt" | "updatedAt"> & { sourceType: "static" | "postgres" | "firebird"; editing: boolean };

const emptyDraft: Draft = { key: "", label: "", description: "", active: true, sourceType: "static", querySql: "", resultValueField: "VALUE", resultLabelField: "LABEL", staticOptions: [{ value: "", label: "" }], editing: false };

export function OptionSourceManager({ initialSources }: { initialSources: Source[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<StaticOption[] | null>(null);
  const [working, setWorking] = useState(false);
  function edit(source?: Source) {
    setMessage(""); setPreview(null);
    setDraft(source && source.sourceType !== "synchronized" ? { ...source, sourceType: source.sourceType, editing: true } : { ...emptyDraft, staticOptions: [{ value: "", label: "" }] });
  }
  function update<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft((current) => current ? { ...current, [key]: value } : current); }
  function updateOption(index: number, patch: Partial<StaticOption>) { setDraft((current) => current ? { ...current, staticOptions: current.staticOptions.map((option, optionIndex) => optionIndex === index ? { ...option, ...patch } : option) } : current); }
  async function previewSource() {
    if (!draft) return;
    setWorking(true); setMessage(""); setPreview(null);
    const payload = { ...draft, staticOptions: draft.sourceType === "static" ? draft.staticOptions : [] };
    const response = await fetch("/api/admin/option-sources/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => ({})); setWorking(false);
    if (!response.ok) { setMessage(body.error || "Não foi possível testar a fonte."); return; }
    setPreview(body.options || []); setMessage("Fonte validada com sucesso.");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!draft) return;
    setWorking(true); setMessage("");
    const payload = { ...draft, staticOptions: draft.sourceType === "static" ? draft.staticOptions : [] };
    const response = await fetch(draft.editing ? `/api/admin/option-sources/${draft.key}` : "/api/admin/option-sources", { method: draft.editing ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => ({})); setWorking(false);
    if (!response.ok) { setMessage(body.error || "Não foi possível salvar a fonte."); return; }
    setDraft(null); router.refresh();
  }
  const typeLabel = { synchronized: "Sincronizada", static: "Lista estática", postgres: "PostgreSQL", firebird: "Firebird" };
  return <>
    <div className="sectionHeading"><div><h2>Fontes disponíveis</h2><p className="muted">Use aliases claros como VALUE e LABEL nas consultas.</p></div><button className="primaryButton" onClick={() => edit()}>+ Nova fonte</button></div>
    {initialSources.length ? <div className="tableWrap responsiveTable"><table><thead><tr><th>Fonte</th><th>Tipo</th><th>Situação</th><th>Atualização</th><th>Ação</th></tr></thead><tbody>{initialSources.map((source) => <tr key={source.key}><td data-label="Fonte"><strong>{source.label}</strong><small>{source.key} · {source.description || "Sem descrição"}</small></td><td data-label="Tipo">{typeLabel[source.sourceType]}</td><td data-label="Situação"><span className={`status ${source.active ? "published" : "archived"}`}>{source.active ? "Ativa" : "Inativa"}</span></td><td data-label="Atualização">{new Intl.DateTimeFormat("pt-BR").format(new Date(source.updatedAt))}</td><td data-label="Ação">{source.sourceType === "synchronized" ? <span className="muted">Gerenciada pela sincronização</span> : <button className="secondaryButton" onClick={() => edit(source)}>Editar</button>}</td></tr>)}</tbody></table></div> : <div className="emptyState"><span>⌄</span><h3>Nenhuma fonte cadastrada</h3><p>Crie uma lista estática ou conecte uma consulta.</p></div>}
    {draft && <div className="modalBackdrop"><section className="builder sourceBuilder" role="dialog" aria-modal="true" aria-labelledby="source-title"><div className="builderHeader"><div><p className="eyebrow">FONTE DE OPÇÕES</p><h2 id="source-title">{draft.editing ? "Editar fonte" : "Nova fonte"}</h2></div><button className="closeButton" onClick={() => setDraft(null)} aria-label="Fechar">×</button></div><form onSubmit={save}>
      <div className="sourceFormGrid"><label>Chave<input value={draft.key} disabled={draft.editing} onChange={(event) => update("key", event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))} placeholder="status_entrega" required /></label><label>Nome<input value={draft.label} onChange={(event) => update("label", event.target.value)} required /></label><label>Tipo<select value={draft.sourceType} onChange={(event) => update("sourceType", event.target.value as Draft["sourceType"])}><option value="static">Lista estática</option><option value="firebird">Consulta Firebird</option><option value="postgres">Consulta PostgreSQL</option></select></label><label className="checkLabel sourceActive"><input type="checkbox" checked={draft.active} onChange={(event) => update("active", event.target.checked)} />Ativa</label></div>
      <label>Descrição<input value={draft.description || ""} onChange={(event) => update("description", event.target.value)} /></label>
      {draft.sourceType === "static" ? <div className="staticOptions"><div className="fieldsTitle"><div><h3>Valores e rótulos</h3><p>O valor é salvo na resposta; o rótulo é exibido para o usuário.</p></div><button type="button" className="secondaryButton" onClick={() => update("staticOptions", [...draft.staticOptions, { value: "", label: "" }])}>+ Opção</button></div>{draft.staticOptions.map((option, index) => <div className="staticOptionRow" key={index}><label>Valor<input value={option.value} onChange={(event) => updateOption(index, { value: event.target.value })} placeholder="P" required /></label><label>Rótulo<input value={option.label} onChange={(event) => updateOption(index, { label: event.target.value })} placeholder="PENDENTE" required /></label><button type="button" className="removeButton" disabled={draft.staticOptions.length === 1} onClick={() => update("staticOptions", draft.staticOptions.filter((_, optionIndex) => optionIndex !== index))}>×</button></div>)}</div> : <><div className="formGrid queryMapping"><label>Campo de valor<input value={draft.resultValueField} onChange={(event) => update("resultValueField", event.target.value)} required /></label><label>Campo de rótulo<input value={draft.resultLabelField} onChange={(event) => update("resultLabelField", event.target.value)} required /></label></div><label className="sqlField">Consulta SELECT<textarea rows={10} spellCheck={false} value={draft.querySql || ""} onChange={(event) => update("querySql", event.target.value)} placeholder="SELECT STATUS AS VALUE, DESCRICAO AS LABEL FROM ..." required /></label><p className="queryHelp">Parâmetros disponíveis: <code>:idfilial</code>, <code>:idfuncionario</code> e <code>:categoria</code>.</p></>}
      {message && <p className={preview ? "formSuccess" : "formError"}>{message}</p>}{preview && <div className="optionPreview">{preview.map((option) => <span key={option.value}><strong>{option.value}</strong>{option.label}</span>)}</div>}
      <div className="builderActions"><button type="button" className="secondaryButton" disabled={working} onClick={previewSource}>Testar fonte</button><button type="button" className="textButton" onClick={() => setDraft(null)}>Cancelar</button><button className="primaryButton" disabled={working}>{working ? "Processando…" : "Salvar fonte"}</button></div>
    </form></section></div>}
  </>;
}
