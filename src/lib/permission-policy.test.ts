import { describe, expect, it } from "vitest";
import { ALL_PERMISSIONS, NO_PERMISSIONS, hasPermission, isAdministrator, landingPath } from "./permission-policy";

describe("permission policy", () => {
  it("always grants full access to employee 752", () => {
    const admin = { employeeId: 752 };
    expect(isAdministrator(admin)).toBe(true);
    expect(hasPermission(admin, NO_PERMISSIONS, "editChecklist")).toBe(true);
    expect(landingPath(admin, NO_PERMISSIONS)).toBe("/admin/checklists");
  });

  it("denies permissions that were not configured", () => {
    const user = { employeeId: 10 };
    expect(hasPermission(user, NO_PERMISSIONS, "viewChecklist")).toBe(false);
    expect(landingPath(user, NO_PERMISSIONS)).toBe("/sem-acesso");
  });

  it("uses category permissions for non administrators", () => {
    const user = { employeeId: 10 };
    expect(hasPermission(user, ALL_PERMISSIONS, "reports")).toBe(true);
    expect(landingPath(user, { ...NO_PERMISSIONS, dashboard: true })).toBe("/dashboard");
  });
});
