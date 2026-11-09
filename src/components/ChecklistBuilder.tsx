"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChecklistFlowDesigner, createDefaultFlow } from "./ChecklistFlowDesigner";
import type { FlowDefinition } from "@/lib/checklist-flow";

export function ChecklistBuilder({ sources }: { sources: { key: string; label: string }[] }) {
  const formId = "checklist-flow-create";
  const router = useRouter();
  const [flow, setFlow] = useState<FlowDefinition>(createDefaultFlow);
  const [open, setOpen] = useState(false); const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null); const savingRef = useRef(saving);
  useEffect(() => { savingRef.current = saving; }, [saving]);
  useEffect(() => { if (!open) return; const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; headingRef.current?.focus(); const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !savingRef.current) setOpen(false); }; window.addEventListener("keydown", escape); return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", escape); }; }, [open]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage(""); const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/checklists", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: form.get("title"), description: form.get("description"), fields: [], flow }) });
    const body = await response.json().catch(() => ({})); setSaving(false);
    if (!response.ok) { setMessage(body.error || "Não foi possível salvar o fluxo."); return; }
    setOpen(false); setFlow(createDefaultFlow()); router.refresh();
  }
  if (!open) return <button className="primaryButton" onClick={() => setOpen(true)}>+ Novo checklist</button>;
  return <div className="modalBackdrop flowModalBackdrop"><section className="builder flowBuilder" role="dialog" aria-modal="true" aria-labelledby="flow-builder-title"><div className="builderHeader flowBuilderHeader"><div><p className="eyebrow">CONSTRUTOR DE FLUXO</p><h2 id="flow-builder-title" ref={headingRef} tabIndex={-1}>Criar checklist inteligente</h2></div><div className="flowHeaderActions"><button type="button" className="textButton" onClick={() => setOpen(false)}>Cancelar</button><button type="submit" form={formId} className="primaryButton" disabled={saving}>{saving ? "Salvando…" : "Salvar rascunho"}</button><button className="closeButton" onClick={() => setOpen(false)} aria-label="Fechar">×</button></div></div><form id={formId} onSubmit={submit}><div className="formGrid flowIdentity"><label>Nome do fluxo<input name="title" minLength={3} required placeholder="Ex.: Conferência para entrega" /></label><label>Descrição<textarea name="description" rows={2} placeholder="Objetivo do processo" /></label></div><ChecklistFlowDesigner value={flow} onChange={setFlow} sources={sources} simulationKey="novo-checklist" />{message && <p className="formError" role="alert">{message}</p>}<div className="builderActions"><button type="button" className="textButton" onClick={() => setOpen(false)}>Cancelar</button><button className="primaryButton" disabled={saving}>{saving ? "Salvando…" : "Salvar rascunho"}</button></div></form></section></div>;
}
