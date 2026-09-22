import { NextResponse } from "next/server";
import { getCurrentUser } from "./session";

export async function getApiAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) } as const;
  if (!user.isAdmin) return { error: NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 }) } as const;
  return { user } as const;
}
