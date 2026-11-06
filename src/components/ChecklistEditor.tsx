"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { formatHumanCode } from "@/lib/human-code";
import type { FlowDefinition, FlowFieldType } from "@/lib/checklist-flow";
import { ChecklistFlowDesigner, createDefaultFlow } from "./ChecklistFlowDesigner";

type LegacyField = { id?: string; label: string; type: FlowFieldType; required: boolean; sourceKey: string | null };
type ChecklistData = { code: number; title: string; description: string | null; fields: LegacyField[]; flow: FlowDefinition | null };

function convertLegacy(fields: LegacyField[]): FlowDefinition {
  if (!fields.length) return createDefaultFlow();
  const nodes: FlowDefinition["nodes"] = [{ nodeKey: "inicio", type: "start", title: "Início", position: 0 }, ...fields.map((field, index) => ({ nodeKey: `campo_${index + 1}`, type: "question" as const, title: field.label, fieldType: field.type, required: field.required, sourceKey: field.sourceKey, position: index + 1 })), { nodeKey: "final_sucesso", type: "end", title: "Finalizado com sucesso", outcome: "success", position: fields.length + 1 }];
  const sequence = nodes.map((node) => node.nodeKey);
  return { nodes, edges: sequence.slice(0, -1).map((sourceKey, index) => ({ sourceKey, targetKey: sequence[index + 1], condition: "always", label: index ? "Próximo" : "Começar", priority: 0 })) };
}

export function ChecklistEditor({ checklistId, sources }: { checklistId: string; sources: { key: string; label: string }[] }) {
  const router = useRouter(); const [data, setData] = useState<ChecklistData | null>(null); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null); const savingRef = useRef(saving);
  const isOpen = Boolean(data);
  useEffect(() => { savingRef.current = saving; }, [saving]);
  useEffect(() => { if (!isOpen) return; const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; headingRef.current?.focus(); const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !savingRef.current) setData(null); }; window.addEventListener("keydown", escape); return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", escape); }; }, [isOpen]);
  async function open() { setLoading(true); setMessage(""); const response = await fetch(`/api/admin/checklists/${checklistId}`); const body = await response.json().catch(() => ({})); setLoading(false); if (!response.ok) { setMessage(body.error || "Não foi possível abrir o checklist."); return; } const checklist = body.checklist as ChecklistData; setData({ ...checklist, flow: checklist.flow || convertLegacy(checklist.fields) }); }
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!data?.flow) return; setSaving(true); setMessage(""); const form = new FormData(event.currentTarget); const response = await fetch(`/api/admin/checklists/${checklistId}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: form.get("title"), description: form.get("description"), fields: [], flow: data.flow }) }); const body = await response.json().catch(() => ({})); setSaving(false); if (!response.ok) { setMessage(body.error || "Não foi possível salvar o fluxo."); return; } setData(null); router.refresh(); }
  return <><button className="secondaryButton" disabled={loading} onClick={open}>{loading ? "Abrindo…" : "Editar fluxo"}</button>{!data && message && <small className="formError">{message}</small>}{data?.flow && <div className="modalBackdrop flowModalBackdrop"><section className="builder flowBuilder" role="dialog" aria-modal="true"><div className="builderHeader"><div><p className="eyebrow">RASCUNHO · {formatHumanCode("CHK", data.code)}</p><h2 ref={headingRef} tabIndex={-1}>Editar fluxo</h2></div><button className="closeButton" onClick={() => setData(null)} aria-label="Fechar">×</button></div><form onSubmit={submit}><div className="formGrid flowIdentity"><label>Nome do fluxo<input name="title" defaultValue={data.title} required /></label><label>Descrição<textarea name="description" rows={2} defaultValue={data.description || ""} /></label></div><ChecklistFlowDesigner value={data.flow} onChange={(flow) => setData((current) => current ? { ...current, flow } : current)} sources={sources} />{message && <p className="formError">{message}</p>}<div className="builderActions"><button type="button" className="textButton" onClick={() => setData(null)}>Cancelar</button><button className="primaryButton" disabled={saving}>{saving ? "Salvando…" : "Salvar alterações"}</button></div></form></section></div>}</>;
}
