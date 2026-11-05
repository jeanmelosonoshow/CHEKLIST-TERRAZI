"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ChecklistPublishButton({ checklistId }: { checklistId: string }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  async function publish() {
    if (!window.confirm("Publicar este checklist? Depois de publicado, o modelo ficará bloqueado para edição.")) return;
    setWorking(true); setMessage("");
    const response = await fetch(`/api/admin/checklists/${checklistId}/publish`, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    setWorking(false);
    if (!response.ok) { setMessage(body.error || "Não foi possível publicar."); return; }
    router.refresh();
  }
  return <div className="inlineActions"><button className="primaryButton" disabled={working} onClick={publish}>{working ? "Publicando…" : "Publicar"}</button>{message && <small className="formError">{message}</small>}</div>;
}
