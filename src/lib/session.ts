import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { categoryPermissions, sessions, users, type User } from "@/db/schema";
import { createSessionToken, hashSessionToken } from "./auth-crypto";
import { hasPermission, isAdministrator, type PermissionKey, type PermissionSet } from "./permissions";
import { ALL_PERMISSIONS, NO_PERMISSIONS } from "./permission-policy";

export const SESSION_COOKIE = "terrazzi_session";
const SESSION_DAYS = 7;

export async function createSession(userId: string) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ tokenHash: hashSessionToken(token), userId, expiresAt });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [result] = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashSessionToken(token)), gt(sessions.expiresAt, new Date()), eq(users.active, true)))
    .limit(1);
  return result?.user ?? null;
}

async function getCurrentUserContext(): Promise<{ user: User; permissions: PermissionSet } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [result] = await db.select({
    user: users,
    permissionCategory: categoryPermissions.category,
    viewChecklist: categoryPermissions.viewChecklist,
    createChecklist: categoryPermissions.createChecklist,
    editChecklist: categoryPermissions.editChecklist,
    reports: categoryPermissions.reports,
    dashboard: categoryPermissions.dashboard,
    stages: categoryPermissions.stages,
  }).from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .leftJoin(categoryPermissions, eq(users.category, categoryPermissions.category))
    .where(and(eq(sessions.tokenHash, hashSessionToken(token)), gt(sessions.expiresAt, new Date()), eq(users.active, true)))
    .limit(1);
  if (!result) return null;
  const permissions = isAdministrator(result.user) ? { ...ALL_PERMISSIONS } : result.permissionCategory ? {
    viewChecklist: Boolean(result.viewChecklist), createChecklist: Boolean(result.createChecklist), editChecklist: Boolean(result.editChecklist),
    reports: Boolean(result.reports), dashboard: Boolean(result.dashboard), stages: Boolean(result.stages),
  } : { ...NO_PERMISSIONS };
  return { user: result.user, permissions };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdministrator(user)) redirect("/sem-acesso");
  return user;
}

export async function requirePermission(permission: PermissionKey) {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");
  if (!hasPermission(context.user, context.permissions, permission)) redirect("/sem-acesso");
  return context;
}

export async function requireAnyPermission(required: PermissionKey[]) {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");
  if (!required.some((permission) => hasPermission(context.user, context.permissions, permission))) redirect("/sem-acesso");
  return context;
}
