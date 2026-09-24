export const ADMIN_EMPLOYEE_ID = 752;

export const permissionKeys = [
  "viewChecklist",
  "createChecklist",
  "editChecklist",
  "reports",
  "dashboard",
  "stages",
] as const;

export type PermissionKey = (typeof permissionKeys)[number];
export type PermissionSet = Record<PermissionKey, boolean>;

export const NO_PERMISSIONS: PermissionSet = {
  viewChecklist: false,
  createChecklist: false,
  editChecklist: false,
  reports: false,
  dashboard: false,
  stages: false,
};

export const ALL_PERMISSIONS: PermissionSet = {
  viewChecklist: true,
  createChecklist: true,
  editChecklist: true,
  reports: true,
  dashboard: true,
  stages: true,
};

export function isAdministrator(user: { employeeId: number }) {
  return user.employeeId === ADMIN_EMPLOYEE_ID;
}

export function hasPermission(
  user: { employeeId: number },
  permissions: PermissionSet,
  permission: PermissionKey,
) {
  return isAdministrator(user) || permissions[permission];
}

export function landingPath(user: { employeeId: number }, permissions: PermissionSet) {
  if (isAdministrator(user) || permissions.createChecklist || permissions.editChecklist) return "/admin/checklists";
  if (permissions.dashboard) return "/dashboard";
  if (permissions.viewChecklist) return "/checklists";
  if (permissions.stages) return "/etapas";
  if (permissions.reports) return "/relatorios";
  return "/sem-acesso";
}
