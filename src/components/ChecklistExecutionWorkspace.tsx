"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { formatHumanCode } from "@/lib/human-code";

type Template = { id: string; code: number; title: string; description: string | null };
type Execution = { id: string; code: number; checklistId: string; checklistTitle: string; checklistCode: number; branchId: string; saleNumber: string; customerName: string | null; status: "pending" | "in_progress" | "completed" | "cancelled"; startedAt: string | null; completedAt: string | null; createdAt: string; updatedAt: string };
type Option = { value: string; label: string };
type Field = { id: string; label: string; description: string | null; type: "short_text" | "long_text" | "number" | "date" | "boolean" | "single_select" | "multi_select"; required: boolean; options: Option[] };
type Detail = { execution: Execution; checklist: Template; fields: Field[]; answers: Record<string, unknown> };
const statusLabels = { pending: "Pendente", in_progress: "Em andamento", completed: "Finalizado", cancelled: "Cancelado" };

export function ChecklistExecutionWorkspace({ templates, initialExecutions, defaultBranchId, administrator }: { templates: Template[]; initialExecutions: Execution[]; defaultBranchId: string; administrator: boolean }) {
  const router = useRouter();
  const [startOpen, setStartOpen] = useState(false);
  const [start, setStart] = useState({ checklistId: templates[0]?.id ?? "", branchId: defaultBranchId, saleNumber: "", customerName: "" });
  const [detail, setDetail] = useState<Detail | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const active = initialExecutions.filter((item) => item.status === "pending" || item.status === "in_progress");
  const completed = initialExecutions.filter((item) => item.status === "completed");
  const progress = useMemo(() => detail ? { answered: detail.fields.filter((field) => !isEmpty(answers[field.id])).length, total: detail.fields.length } : { answered: 0, total: 0 }, [detail, answers]);

  async function createExecution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setWorking(true); setMessage("");
    const response = await fetch("/api/checklist-executions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(start) });
    const body = await response.json().catch(() => ({})); setWorking(false);
    if (!response.ok) { setMessage(body.error || "Não foi possível iniciar o checklist."); return; }
    setStartOpen(false); setStart((current) => ({ ...current, saleNumber: "", customerName: "" }));
    router.refresh(); await openExecution(body.execution.id);
  }
  async function openExecution(id: string) {
    setWorking(true); setMessage("");
    const response = await fetch(`/api/checklist-executions/${id}`); const body = await response.json().catch(() => ({})); setWorking(false);
    if (!response.ok) { setMessage(body.error || "Não foi possível abrir o checklist."); return; }
    setDetail(body); setAnswers(body.answers || {});
  }
  async function save(complete: boolean) {
    if (!detail) return; setWorking(true); setMessage("");
    const response = await fetch(`/api/checklist-executions/${detail.execution.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers, complete }) });
    const body = await response.json().catch(() => ({})); setWorking(false);
    if (!response.ok) { setMessage(body.error || "Não foi possível salvar as respostas."); return; }
    setDetail(null); setMessage(complete ? "Checklist finalizado com sucesso." : "Progresso salvo com sucesso."); router.refresh();
  }
  function setAnswer(fieldId: string, value: unknown) { setAnswers((current) => ({ ...current, [fieldId]: value })); }
  function toggleMulti(fieldId: string, value: string, checked: boolean) { const current = Array.isArray(answers[fieldId]) ? answers[fieldId] as string[] : []; setAnswer(fieldId, checked ? [...current, value] : current.filter((item) => item !== value)); }

  return <>
    <section className="heroRow"><div><p className="eyebrow">CONTROLE OPERACIONAL</p><h1>Checklists de vendas</h1><p className="muted">Inicie uma demanda por venda, acompanhe o preenchimento e finalize todos os itens obrigatórios.</p></div><button className="primaryButton" disabled={!templates.length} onClick={() => { setMessage(""); setStartOpen(true); }}>+ Iniciar checklist</button></section>
    <section className="statsGrid compact checklistControlStats"><article className="statCard accent"><span>Pendentes</span><strong>{active.filter((item) => item.status === "pending").length}</strong><small>Aguardando primeiro preenchimento</small></article><article className="statCard"><span>Em andamento</span><strong>{active.filter((item) => item.status === "in_progress").length}</strong><small>Com respostas salvas</small></article><article className="statCard"><span>Finalizados</span><strong>{completed.length}</strong><small>Execuções concluídas</small></article></section>
    {message && !startOpen && !detail && <p className={message.includes("sucesso") ? "feedbackToast formSuccess" : "feedbackToast formError"}>{message}</p>}
    <section className="sectionBlock checklistControlSection"><div className="sectionHeading"><div><h2>Pendentes e em andamento</h2><p className="muted">Cada cartão representa uma demanda vinculada a uma filial e venda.</p></div></div>{active.length ? <div className="executionGrid">{active.map((item) => <ExecutionCard key={item.id} item={item} onOpen={() => openExecution(item.id)} />)}</div> : <CompactEmpty icon="✓" title="Nenhuma pendência" text="Inicie um checklist para gerar uma nova demanda." />}</section>
    <section className="sectionBlock checklistControlSection"><div className="sectionHeading"><div><h2>Finalizados</h2><p className="muted">Histórico concluído disponível para consulta.</p></div></div>{completed.length ? <div className="tableWrap responsiveTable"><table><thead><tr><th>Checklist</th><th>Venda</th><th>Filial</th><th>Cliente</th><th>Finalizado</th><th>Ação</th></tr></thead><tbody>{completed.map((item) => <tr key={item.id}><td data-label="Checklist"><strong>{item.checklistTitle}</strong><small>{formatHumanCode("EXE", item.code)}</small></td><td data-label="Venda">{item.saleNumber}</td><td data-label="Filial">{item.branchId}</td><td data-label="Cliente">{item.customerName || "—"}</td><td data-label="Finalizado">{formatDate(item.completedAt)}</td><td data-label="Ação"><button className="secondaryButton" onClick={() => openExecution(item.id)}>Consultar</button></td></tr>)}</tbody></table></div> : <CompactEmpty icon="⌁" title="Sem checklists finalizados" text="As conclusões serão registradas aqui." />}</section>
    {startOpen && <StartModal templates={templates} administrator={administrator} start={start} message={message} working={working} setStart={setStart} close={() => setStartOpen(false)} submit={createExecution} />}
    {detail && <ExecutionModal detail={detail} answers={answers} progress={progress} working={working} message={message} close={() => setDetail(null)} save={save} setAnswer={setAnswer} toggleMulti={toggleMulti} />}
  </>;
}

function StartModal({ templates, administrator, start, message, working, setStart, close, submit }: { templates: Template[]; administrator: boolean; start: { checklistId: string; branchId: string; saleNumber: string; customerName: string }; message: string; working: boolean; setStart: (value: typeof start) => void; close: () => void; submit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="modalBackdrop"><section className="builder startExecutionModal" role="dialog" aria-modal="true"><div className="builderHeader"><div><p className="eyebrow">NOVA DEMANDA</p><h2>Associar checklist à venda</h2></div><button className="closeButton" onClick={close} aria-label="Fechar">×</button></div><form onSubmit={submit}><div className="formGrid"><label>Checklist<select value={start.checklistId} onChange={(event) => setStart({ ...start, checklistId: event.target.value })} required>{templates.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}</select></label><label>Filial<input value={start.branchId} disabled={!administrator} onChange={(event) => setStart({ ...start, branchId: event.target.value })} required /></label><label>Número da venda<input value={start.saleNumber} onChange={(event) => setStart({ ...start, saleNumber: event.target.value })} required autoFocus /></label><label>Cliente (opcional)<input value={start.customerName} onChange={(event) => setStart({ ...start, customerName: event.target.value })} /></label></div>{message && <p className="formError">{message}</p>}<div className="builderActions"><button type="button" className="textButton" onClick={close}>Cancelar</button><button className="primaryButton" disabled={working}>{working ? "Iniciando…" : "Gerar pendência"}</button></div></form></section></div>;
}

function ExecutionModal({ detail, answers, progress, working, message, close, save, setAnswer, toggleMulti }: { detail: Detail; answers: Record<string, unknown>; progress: { answered: number; total: number }; working: boolean; message: string; close: () => void; save: (complete: boolean) => void; setAnswer: (id: string, value: unknown) => void; toggleMulti: (id: string, value: string, checked: boolean) => void }) {
  const closed = detail.execution.status === "completed";
  return <div className="modalBackdrop"><section className="builder executionModal" role="dialog" aria-modal="true"><div className="builderHeader"><div><p className="eyebrow">{formatHumanCode("EXE", detail.execution.code)} · VENDA {detail.execution.saleNumber}</p><h2>{detail.checklist.title}</h2><p className="muted">Filial {detail.execution.branchId}{detail.execution.customerName ? ` · ${detail.execution.customerName}` : ""}</p></div><button className="closeButton" onClick={close} aria-label="Fechar">×</button></div><div className="executionProgress"><span><strong>{progress.answered}</strong> de {progress.total} itens preenchidos</span><i><b style={{ width: `${progress.total ? progress.answered / progress.total * 100 : 0}%` }} /></i></div><div className="executionFields">{detail.fields.map((field, index) => <ExecutionField key={field.id} field={field} index={index} value={answers[field.id]} disabled={closed} onChange={(value) => setAnswer(field.id, value)} onToggle={(value, checked) => toggleMulti(field.id, value, checked)} />)}</div>{message && <p className="formError">{message}</p>}<div className="builderActions"><button type="button" className="textButton" onClick={close}>Fechar</button>{!closed && <><button type="button" className="secondaryButton" disabled={working} onClick={() => save(false)}>Salvar progresso</button><button type="button" className="primaryButton" disabled={working} onClick={() => save(true)}>Finalizar checklist</button></>}</div></section></div>;
}

function ExecutionCard({ item, onOpen }: { item: Execution; onOpen: () => void }) { return <article className="executionCard"><div><span className={`executionStatus ${item.status}`}>{statusLabels[item.status]}</span><small className="entityCode">{formatHumanCode("EXE", item.code)}</small></div><h3>{item.checklistTitle}</h3><p>Venda <strong>{item.saleNumber}</strong> · Filial {item.branchId}</p><small>{item.customerName || "Cliente não informado"}</small><button className="secondaryButton" onClick={onOpen}>{item.status === "pending" ? "Começar preenchimento" : "Continuar"}</button></article>; }

function ExecutionField({ field, index, value, disabled, onChange, onToggle }: { field: Field; index: number; value: unknown; disabled: boolean; onChange: (value: unknown) => void; onToggle: (value: string, checked: boolean) => void }) {
  const label = <span className="executionFieldLabel"><b>{index + 1}</b><span>{field.label}{field.required && <em>Obrigatório</em>}{field.description && <small>{field.description}</small>}</span></span>;
  if (field.type === "boolean") return <div className="executionField">{label}<div className="booleanChoices"><label><input type="radio" name={field.id} checked={value === true} disabled={disabled} onChange={() => onChange(true)} />Sim</label><label><input type="radio" name={field.id} checked={value === false} disabled={disabled} onChange={() => onChange(false)} />Não</label></div></div>;
  if (field.type === "single_select") return <label className="executionField">{label}<select value={typeof value === "string" ? value : ""} disabled={disabled} onChange={(event) => onChange(event.target.value)}><option value="">Selecione</option>{field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
  if (field.type === "multi_select") { const selected = Array.isArray(value) ? value as string[] : []; return <div className="executionField">{label}<div className="multiChoices">{field.options.map((option) => <label key={option.value}><input type="checkbox" checked={selected.includes(option.value)} disabled={disabled} onChange={(event) => onToggle(option.value, event.target.checked)} />{option.label}</label>)}</div></div>; }
  if (field.type === "long_text") return <label className="executionField">{label}<textarea rows={4} value={typeof value === "string" ? value : ""} disabled={disabled} onChange={(event) => onChange(event.target.value)} /></label>;
  return <label className="executionField">{label}<input type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={typeof value === "string" || typeof value === "number" ? value : ""} disabled={disabled} onChange={(event) => onChange(field.type === "number" ? event.target.value === "" ? "" : Number(event.target.value) : event.target.value)} /></label>;
}

function CompactEmpty({ icon, title, text }: { icon: string; title: string; text: string }) { return <div className="emptyState compactEmpty"><span>{icon}</span><h3>{title}</h3><p>{text}</p></div>; }
function isEmpty(value: unknown) { return value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0); }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—"; }
