import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { Logo } from "@/components/Logo";
import { getCurrentUser } from "@/lib/session";
import { getLandingPath } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(await getLandingPath(user));
  return (
    <main className="loginPage">
      <section className="loginIntro">
        <Logo />
        <div>
          <p className="eyebrow">PROCESSOS EM MOVIMENTO</p>
          <h1>Clareza para cada etapa.</h1>
          <p>Checklists, responsáveis e andamento em um só lugar — no computador ou no celular.</p>
        </div>
        <p className="loginFoot">Ambiente interno • acesso protegido</p>
      </section>
      <section className="loginPanel">
        <div className="loginCard">
          <p className="eyebrow">BEM-VINDO</p>
          <h2>Acesse sua conta</h2>
          <p className="muted">Use as mesmas credenciais do sistema interno.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
