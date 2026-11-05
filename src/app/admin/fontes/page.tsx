import { asc } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { OptionSourceManager } from "@/components/OptionSourceManager";
import { db } from "@/db";
import { syncedSources } from "@/db/schema";
import { getUserPermissions } from "@/lib/permissions";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function OptionSourcesPage() {
  const user = await requireAdmin();
  const permissions = await getUserPermissions(user);
  const sources = await db.select().from(syncedSources).orderBy(asc(syncedSources.label));
  return <AppShell user={user} permissions={permissions} active="sources">
    <section className="heroRow"><div><p className="eyebrow">CONFIGURAÇÃO</p><h1>Fontes de seleção</h1><p className="muted">Listas reutilizáveis para perguntas de seleção única ou múltipla.</p></div></section>
    <section className="sectionBlock"><OptionSourceManager initialSources={sources.map((source) => ({ ...source, lastSyncedAt: source.lastSyncedAt?.toISOString() || null, createdAt: source.createdAt.toISOString(), updatedAt: source.updatedAt.toISOString() }))} /></section>
  </AppShell>;
}
