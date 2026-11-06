"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ChecklistLifecycleActions({ checklistId, status }: { checklistId: string; status: "draft" | "published" | "revoked" | "archived" }) {
  const router = useRouter(); const [working, setWorking] = useState(""); const [message, setMessage] = useState("");
  async function clone(mode: "clone" | "revision") {
    const prompt = mode === "revision" ? "Criar uma revisão? O publicado será revogado e uma cópia editável será criada como rascunho." : "Clonar este checklist como um novo rascunho?";
    if (!window.confirm(prompt)) return; setWorking(mode); setMessage("");
    const response = await fetch(`/api/admin/checklists/${checklistId}/clone`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode }) });
    const body = await response.json().catch(() => ({})); setWorking(""); if (!response.ok) { setMessage(body.error || "Não foi possível criar a cópia."); return; } router.refresh();
  }
  async function archive() {
    if (!window.confirm("Arquivar este checklist? Ele ficará indisponível para novas demandas e será mantido apenas no histórico.")) return; setWorking("archive"); setMessage("");
    const response = await fetch(`/api/admin/checklists/${checklistId}/archive`, { method: "POST" }); const body = await response.json().catch(() => ({})); setWorking("");
    if (!response.ok) { setMessage(body.error || "Não foi possível arquivar."); return; } router.refresh();
  }
  return <div className="inlineActions checklistLifecycleActions">{status === "published" && <button type="button" className="secondaryButton" disabled={Boolean(working)} onClick={() => clone("revision")}>{working === "revision" ? "Criando revisão…" : "Revisar"}</button>}<button type="button" className="secondaryButton" disabled={Boolean(working)} onClick={() => clone("clone")}>{working === "clone" ? "Clonando…" : "Clonar"}</button>{status !== "archived" && <button type="button" className="secondaryButton dangerButton" disabled={Boolean(working)} onClick={archive}>{working === "archive" ? "Arquivando…" : "Arquivar"}</button>}{message && <small className="formError">{message}</small>}</div>;
}
