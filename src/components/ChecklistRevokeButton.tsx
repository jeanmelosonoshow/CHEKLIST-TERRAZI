"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ChecklistRevokeButton({ checklistId }: { checklistId: string }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function revoke() {
    if (!window.confirm("Revogar este checklist? Ele não aparecerá em novas demandas, mas as execuções existentes serão preservadas.")) return;
    setWorking(true); setMessage("");
    const response = await fetch(`/api/admin/checklists/${checklistId}/revoke`, { method: "POST" });
    const body = await response.json().catch(() => ({})); setWorking(false);
    if (!response.ok) { setMessage(body.error || "Não foi possível revogar o checklist."); return; }
    router.refresh();
  }

  return <div className="inlineActions"><button className="secondaryButton dangerButton" disabled={working} onClick={revoke}>{working ? "Revogando…" : "Revogar"}</button>{message && <small className="formError">{message}</small>}</div>;
}
