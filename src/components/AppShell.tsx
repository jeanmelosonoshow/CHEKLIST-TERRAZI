import { Logo } from "./Logo";
import { PrimaryNavigation } from "./PrimaryNavigation";
import { isAdministrator, type PermissionSet } from "@/lib/permissions";

export function AppShell({ children, user, permissions, active }: { children: React.ReactNode; user: { employeeName: string; employeeId: number }; permissions: PermissionSet; active?: "dashboard" | "checklists" | "management" | "permissions" | "reports" | "stages" }) {
  const initials = user.employeeName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const administrator = isAdministrator(user);
  return (
    <div className="appShell">
      <header className="topbar">
        <Logo />
        <PrimaryNavigation permissions={permissions} administrator={administrator} active={active} />
        <div className="userMenu"><span className="avatar">{initials}</span><span className="userName">{user.employeeName}</span>
          <form action="/api/auth/logout" method="post"><button className="textButton logoutButton">Sair</button></form>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
