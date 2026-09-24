"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Field = { label: string; type: "short_text" | "long_text" | "number" | "date" | "boolean" | "single_select" | "multi_select"; required: boolean; sourceKey: string | null };
const types = [
  ["short_text", "Texto curto"], ["long_text", "Texto longo"], ["number", "Número"], ["date", "Data"], ["boolean", "Sim / Não"], ["single_select", "Seleção única"], ["multi_select", "Seleção múltipla"],
] as const;

export function ChecklistBuilder({ sources }: { sources: { key: string; label: string }[] }) {
  const router = useRouter();
  const [fields, setFields] = useState<Field[]>([{ label: "", type: "short_text", required: false, sourceKey: null }]);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const savingRef = useRef(saving);

  useEffect(() => { savingRef.current = saving; }, [saving]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    headingRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !savingRef.current) setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [open]);

  function update(index: number, patch: Partial<Field>) { setFields((current) => current.map((field, i) => i === index ? { ...field, ...patch } : field)); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/checklists", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: form.get("title"), description: form.get("description"), fields }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(data.error || "Não foi possível salvar."); setSaving(false); return; }
    setOpen(false); setFields([{ label: "", type: "short_text", required: false, sourceKey: null }]); setSaving(false); router.refresh();
  }

  if (!open) return <button className="primaryButton" onClick={() => setOpen(true)}>+ Novo checklist</button>;
  return (
    <div className="modalBackdrop" role="presentation">
      <section className="builder" role="dialog" aria-modal="true" aria-labelledby="builder-title">
        <div className="builderHeader"><div><p className="eyebrow">NOVO FLUXO</p><h2 id="builder-title" ref={headingRef} tabIndex={-1}>Criar checklist</h2></div><button className="closeButton" onClick={() => setOpen(false)} aria-label="Fechar criação do checklist">×</button></div>
        <form onSubmit={submit}>
          <div className="formGrid"><label>Título<input name="title" minLength={3} required placeholder="Ex.: Conferência de recebimento" /></label><label>Descrição<textarea name="description" rows={2} placeholder="Objetivo e contexto do checklist" /></label></div>
          <div className="fieldsTitle"><div><h3>Perguntas e campos</h3><p>Organize as informações que deverão ser preenchidas.</p></div><button type="button" className="secondaryButton" onClick={() => setFields((current) => [...current, { label: "", type: "short_text", required: false, sourceKey: null }])}>+ Adicionar campo</button></div>
          <div className="fieldList">{fields.map((field, index) => <div className="fieldRow" key={index}><span className="fieldNumber">{index + 1}</span><label className="fieldLabel">Pergunta<input value={field.label} onChange={(e) => update(index, { label: e.target.value })} required placeholder="Digite a pergunta" /></label><label className="typeField">Tipo<select value={field.type} onChange={(e) => update(index, { type: e.target.value as Field["type"], sourceKey: null })}>{types.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>{(field.type === "single_select" || field.type === "multi_select") && <label className="sourceField">Fonte<select value={field.sourceKey || ""} onChange={(e) => update(index, { sourceKey: e.target.value || null })}><option value="">Opções manuais (futuro)</option>{sources.map((source) => <option value={source.key} key={source.key}>{source.label}</option>)}</select></label>}<label className="checkLabel"><input type="checkbox" checked={field.required} onChange={(e) => update(index, { required: e.target.checked })} />Obrigatório</label><button type="button" className="removeButton" disabled={fields.length === 1} onClick={() => setFields((current) => current.filter((_, i) => i !== index))} aria-label={`Remover campo ${index + 1}`}>×</button></div>)}</div>
          {message && <p className="formError" role="alert">{message}</p>}
          <div className="builderActions"><button type="button" className="textButton" onClick={() => setOpen(false)}>Cancelar</button><button className="primaryButton" disabled={saving}>{saving ? "Salvando…" : "Salvar rascunho"}</button></div>
        </form>
      </section>
    </div>
  );
}
