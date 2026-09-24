"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Field = { label: string; type: "short_text" | "long_text" | "number" | "date" | "boolean" | "single_select" | "multi_select"; required: boolean; sourceKey: string | null };
type ChecklistData = { title: string; description: string | null; fields: Field[] };
const types = [
  ["short_text", "Texto curto"], ["long_text", "Texto longo"], ["number", "Número"], ["date", "Data"], ["boolean", "Sim / Não"], ["single_select", "Seleção única"], ["multi_select", "Seleção múltipla"],
] as const;

export function ChecklistEditor({ checklistId, sources }: { checklistId: string; sources: { key: string; label: string }[] }) {
  const router = useRouter();
  const [data, setData] = useState<ChecklistData | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function open() {
    setLoading(true); setMessage("");
    const response = await fetch(`/api/admin/checklists/${checklistId}`);
    const body = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) { setMessage(body.error || "Não foi possível abrir o checklist."); return; }
    setData(body.checklist);
  }

  function update(index: number, patch: Partial<Field>) {
    setData((current) => current ? { ...current, fields: current.fields.map((field, i) => i === index ? { ...field, ...patch } : field) } : current);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    setSaving(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/checklists/${checklistId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: form.get("title"), description: form.get("description"), fields: data.fields }),
    });
    const body = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) { setMessage(body.error || "Não foi possível salvar."); return; }
    setData(null); router.refresh();
  }

  return <>
    <button className="secondaryButton" disabled={loading} onClick={open}>{loading ? "Abrindo…" : "Editar"}</button>
    {!data && message && <small className="formError">{message}</small>}
    {data && <div className="modalBackdrop" role="presentation">
      <section className="builder" role="dialog" aria-modal="true" aria-labelledby={`edit-${checklistId}`}>
        <div className="builderHeader"><div><p className="eyebrow">RASCUNHO</p><h2 id={`edit-${checklistId}`}>Editar checklist</h2></div><button className="closeButton" onClick={() => setData(null)} aria-label="Fechar">×</button></div>
        <form onSubmit={submit}>
          <div className="formGrid"><label>Título<input name="title" defaultValue={data.title} minLength={3} required /></label><label>Descrição<textarea name="description" defaultValue={data.description || ""} rows={2} /></label></div>
          <div className="fieldsTitle"><div><h3>Perguntas e campos</h3><p>A edição é permitida somente enquanto o checklist estiver em rascunho.</p></div><button type="button" className="secondaryButton" onClick={() => setData((current) => current ? { ...current, fields: [...current.fields, { label: "", type: "short_text", required: false, sourceKey: null }] } : current)}>+ Adicionar campo</button></div>
          <div className="fieldList">{data.fields.map((field, index) => <div className="fieldRow" key={index}><span className="fieldNumber">{index + 1}</span><label className="fieldLabel">Pergunta<input value={field.label} onChange={(event) => update(index, { label: event.target.value })} required /></label><label>Tipo<select value={field.type} onChange={(event) => update(index, { type: event.target.value as Field["type"], sourceKey: null })}>{types.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>{(field.type === "single_select" || field.type === "multi_select") && <label>Fonte<select value={field.sourceKey || ""} onChange={(event) => update(index, { sourceKey: event.target.value || null })}><option value="">Opções manuais (futuro)</option>{sources.map((source) => <option value={source.key} key={source.key}>{source.label}</option>)}</select></label>}<label className="checkLabel"><input type="checkbox" checked={field.required} onChange={(event) => update(index, { required: event.target.checked })} />Obrigatório</label><button type="button" className="removeButton" disabled={data.fields.length === 1} onClick={() => setData((current) => current ? { ...current, fields: current.fields.filter((_, i) => i !== index) } : current)} aria-label="Remover campo">×</button></div>)}</div>
          {message && <p className="formError">{message}</p>}
          <div className="builderActions"><button type="button" className="textButton" onClick={() => setData(null)}>Cancelar</button><button className="primaryButton" disabled={saving}>{saving ? "Salvando…" : "Salvar alterações"}</button></div>
        </form>
      </section>
    </div>}
  </>;
}
