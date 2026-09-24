import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getLandingPath, getUserPermissions } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NoAccessPage() {
  const user = await requireUser();
  const permissions = await getUserPermissions(user);
  const destination = await getLandingPath(user);
  return <AppShell user={user} permissions={permissions}>
    <section className="emptyState accessDenied"><span>!</span><h1>Acesso não autorizado</h1><p>Sua categoria não possui permissão para acessar este recurso.</p>{destination !== "/sem-acesso" && <Link className="primaryButton" href={destination}>Voltar para a área inicial</Link>}</section>
  </AppShell>;
}
