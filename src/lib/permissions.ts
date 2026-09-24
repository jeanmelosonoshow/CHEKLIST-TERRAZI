import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categoryPermissions, type User } from "@/db/schema";
import {
  ALL_PERMISSIONS,
  NO_PERMISSIONS,
  hasPermission,
  isAdministrator,
  landingPath,
  type PermissionKey,
  type PermissionSet,
} from "./permission-policy";

export { hasPermission, isAdministrator, type PermissionKey, type PermissionSet };

export async function getUserPermissions(user: User): Promise<PermissionSet> {
  if (isAdministrator(user)) return { ...ALL_PERMISSIONS };
  if (!user.category) return { ...NO_PERMISSIONS };

  const [configured] = await db
    .select({
      viewChecklist: categoryPermissions.viewChecklist,
      createChecklist: categoryPermissions.createChecklist,
      editChecklist: categoryPermissions.editChecklist,
      reports: categoryPermissions.reports,
      dashboard: categoryPermissions.dashboard,
      stages: categoryPermissions.stages,
    })
    .from(categoryPermissions)
    .where(eq(categoryPermissions.category, user.category))
    .limit(1);

  return configured ?? { ...NO_PERMISSIONS };
}

export async function getLandingPath(user: User) {
  return landingPath(user, await getUserPermissions(user));
}
