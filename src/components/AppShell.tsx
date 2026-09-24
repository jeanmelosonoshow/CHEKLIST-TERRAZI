import Link from "next/link";
import { Logo } from "./Logo";
import { isAdministrator, type PermissionSet } from "@/lib/permissions";

export function AppShell({ children, user, permissions, active }: { children: React.ReactNode; user: { employeeName: string; employeeId: number }; permissions: PermissionSet; active?: "dashboard" | "checklists" | "management" | "permissions" | "reports" }) {
  const initials = user.employeeName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const administrator = isAdministrator(user);
  return (
    <div className="appShell">
      <header className="topbar">
        <Logo />
        <nav aria-label="Navegação principal">
          {permissions.dashboard && <Link className={active === "dashboard" ? "active" : ""} href="/dashboard">Início</Link>}
          {permissions.viewChecklist && <Link className={active === "checklists" ? "active" : ""} href="/checklists">Checklists</Link>}
          {(permissions.createChecklist || permissions.editChecklist) && <Link className={active === "management" ? "active" : ""} href="/admin/checklists">Gestão</Link>}
          {permissions.reports && <Link className={active === "reports" ? "active" : ""} href="/relatorios">Relatórios</Link>}
          {administrator && <Link className={active === "permissions" ? "active" : ""} href="/admin/permissoes">Permissões</Link>}
        </nav>
        <div className="userMenu"><span className="avatar">{initials}</span><span className="userName">{user.employeeName}</span>
          <form action="/api/auth/logout" method="post"><button className="textButton">Sair</button></form>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
