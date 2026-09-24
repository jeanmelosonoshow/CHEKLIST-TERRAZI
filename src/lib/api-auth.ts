import { NextResponse } from "next/server";
import { getCurrentUser } from "./session";
import { getUserPermissions, hasPermission, isAdministrator, type PermissionKey } from "./permissions";

export async function getApiAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) } as const;
  if (!isAdministrator(user)) return { error: NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 }) } as const;
  return { user } as const;
}

export async function getApiPermission(permission: PermissionKey) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) } as const;
  const permissions = await getUserPermissions(user);
  if (!hasPermission(user, permissions, permission)) {
    return { error: NextResponse.json({ error: "Você não possui permissão para esta ação." }, { status: 403 }) } as const;
  }
  return { user, permissions } as const;
}
