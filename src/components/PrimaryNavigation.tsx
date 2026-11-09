"use client";

import Link, { useLinkStatus } from "next/link";
import { useEffect, useRef } from "react";
import type { PermissionSet } from "@/lib/permissions";

type ActiveArea = "dashboard" | "dashboardSettings" | "sources" | "checklists" | "management" | "permissions" | "reports" | "stages";

function NavigationLabel({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return <span className={pending ? "navigationLabel pending" : "navigationLabel"}>{label}{pending && <i aria-hidden="true" />}</span>;
}

export function PrimaryNavigation({ permissions, administrator, active }: { permissions: PermissionSet; administrator: boolean; active?: ActiveArea }) {
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    navigationRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ behavior: "instant", block: "nearest", inline: "center" });
  }, [active]);

  const link = (area: ActiveArea, href: string, label: string) => <Link aria-current={active === area ? "page" : undefined} className={active === area ? "active" : ""} href={href} prefetch><NavigationLabel label={label} /></Link>;

  return <nav aria-label="Navegação principal" ref={navigationRef}>
    {permissions.dashboard && link("dashboard", "/dashboard", "Início")}
    {permissions.viewChecklist && link("checklists", "/checklists", "Checklists")}
    {permissions.stages && link("stages", "/etapas", "Etapas")}
    {(permissions.createChecklist || permissions.editChecklist) && link("management", "/admin/checklists", "Gestão")}
    {permissions.reports && link("reports", "/relatorios", "Relatórios")}
    {administrator && link("dashboardSettings", "/admin/dashboard", "Configurar painel")}
    {administrator && link("sources", "/admin/fontes", "Fontes")}
    {administrator && link("permissions", "/admin/permissoes", "Permissões")}
  </nav>;
}
