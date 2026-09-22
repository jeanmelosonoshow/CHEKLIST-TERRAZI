import Link from "next/link";
import { Logo } from "./Logo";

export function AppShell({ children, user, admin = false }: { children: React.ReactNode; user: { employeeName: string; isAdmin: boolean }; admin?: boolean }) {
  const initials = user.employeeName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <div className="appShell">
      <header className="topbar">
        <Logo />
        <nav aria-label="Navegação principal">
          <Link className={!admin ? "active" : ""} href="/dashboard">Início</Link>
          {user.isAdmin && <Link className={admin ? "active" : ""} href="/admin/checklists">Administração</Link>}
        </nav>
        <div className="userMenu"><span className="avatar">{initials}</span><span className="userName">{user.employeeName}</span>
          <form action="/api/auth/logout" method="post"><button className="textButton">Sair</button></form>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
