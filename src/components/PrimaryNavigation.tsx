"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { PermissionSet } from "@/lib/permissions";

type ActiveArea = "dashboard" | "checklists" | "management" | "permissions" | "reports" | "stages";

export function PrimaryNavigation({ permissions, administrator, active }: { permissions: PermissionSet; administrator: boolean; active?: ActiveArea }) {
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    navigationRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ behavior: "instant", block: "nearest", inline: "center" });
  }, [active]);

  const link = (area: ActiveArea, href: string, label: string) => <Link aria-current={active === area ? "page" : undefined} className={active === area ? "active" : ""} href={href}>{label}</Link>;

  return <nav aria-label="Navegação principal" ref={navigationRef}>
    {permissions.dashboard && link("dashboard", "/dashboard", "Início")}
    {permissions.viewChecklist && link("checklists", "/checklists", "Checklists")}
    {permissions.stages && link("stages", "/etapas", "Etapas")}
    {(permissions.createChecklist || permissions.editChecklist) && link("management", "/admin/checklists", "Gestão")}
    {permissions.reports && link("reports", "/relatorios", "Relatórios")}
    {administrator && link("permissions", "/admin/permissoes", "Permissões")}
  </nav>;
}
