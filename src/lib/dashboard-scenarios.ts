import type { dashboardScenarios } from "@/db/schema";

export type DashboardScenario = typeof dashboardScenarios.$inferSelect;

export function scenarioConfiguration(scenario: DashboardScenario) {
  return {
    title: scenario.title,
    description: scenario.description,
    visualization: scenario.visualization,
    summarySql: scenario.summarySql,
    detailSql: scenario.detailSql,
    labelField: scenario.labelField,
    valueField: scenario.valueField,
    color: scenario.color,
    position: scenario.position,
    active: scenario.active,
  };
}

export function publicScenario(scenario: DashboardScenario) {
  return {
    id: scenario.id,
    title: scenario.title,
    description: scenario.description,
    visualization: scenario.visualization,
    labelField: scenario.labelField,
    valueField: scenario.valueField,
    color: scenario.color,
    position: scenario.position,
    hasDetails: Boolean(scenario.detailSql),
  };
}
