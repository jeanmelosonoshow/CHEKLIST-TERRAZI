"use client";

import { useState } from "react";
import type { PermissionKey, PermissionSet } from "@/lib/permissions";

type Row = PermissionSet & { category: string; configured: boolean };
const columns: { key: PermissionKey; label: string }[] = [
  { key: "viewChecklist", label: "Visualizar checklist" },
  { key: "createChecklist", label: "Incluir checklist" },
  { key: "editChecklist", label: "Editar checklist" },
  { key: "reports", label: "Relatórios" },
  { key: "dashboard", label: "Dashboard" },
  { key: "stages", label: "Etapas" },
];

export function PermissionsEditor({ initialRows }: { initialRows: Row[] }) {
  const [rows, setRows] = useState(initialRows);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  function toggle(category: string, key: PermissionKey) {
    setRows((current) => current.map((row) => row.category === category ? { ...row, [key]: !row[key] } : row));
  }

  async function save(row: Row) {
    setSaving(row.category); setMessage("");
    const response = await fetch("/api/admin/permissions", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ category: row.category, ...Object.fromEntries(columns.map(({ key }) => [key, row[key]])) }),
    });
    const body = await response.json().catch(() => ({}));
    setSaving(null);
    if (!response.ok) { setMessage(body.error || "Não foi possível salvar as permissões."); return; }
    setRows((current) => current.map((item) => item.category === row.category ? { ...item, configured: true } : item));
    setMessage(`Permissões de ${row.category} salvas.`);
  }

  return <>
    {message && <p className={`feedbackToast ${message.startsWith("Permissões") ? "formSuccess" : "formError"}`} role="status" aria-live="polite">{message}</p>}
    <div className="tableWrap permissionsTable responsiveTable"><table><thead><tr><th>Categoria</th>{columns.map((column) => <th key={column.key}>{column.label}</th>)}<th>Ação</th></tr></thead><tbody>{rows.map((row) => <tr key={row.category}><td data-label="Categoria"><strong>{row.category}</strong><small>{row.configured ? "Configurada" : "Sem configuração — acesso negado"}</small></td>{columns.map((column) => <td data-label={column.label} key={column.key}><label className="permissionToggle"><input type="checkbox" checked={row[column.key]} onChange={() => toggle(row.category, column.key)} /><span>{row[column.key] ? "Sim" : "Não"}</span></label></td>)}<td data-label="Ação"><button className="primaryButton" disabled={saving === row.category} onClick={() => save(row)}>{saving === row.category ? "Salvando…" : "Salvar alterações"}</button></td></tr>)}</tbody></table></div>
  </>;
}
