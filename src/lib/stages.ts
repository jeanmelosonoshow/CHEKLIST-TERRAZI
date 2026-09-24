export const stageDefinitions = [
  { key: "separation", label: "Separação" },
  { key: "disassembly", label: "Desmontagem" },
  { key: "waterproofing", label: "Impermeabilização" },
  { key: "delivery", label: "Entrega" },
  { key: "assembly", label: "Montagem" },
] as const;

export const stageStatuses = {
  pending: { label: "Pendente", tone: "pending" },
  completed: { label: "Concluído com sucesso", tone: "completed" },
  notPerformed: { label: "Não realizado", tone: "notPerformed" },
  partiallyCompleted: { label: "Realizado parcialmente", tone: "partiallyCompleted" },
  notApplicable: { label: "Não possui", tone: "notApplicable" },
} as const;

export type StageKey = (typeof stageDefinitions)[number]["key"];
export type StageStatus = keyof typeof stageStatuses;
export type StageProcessRow = {
  id: string;
  branch: string;
  sale: string;
  customerName: string;
  stages: Record<StageKey, StageStatus>;
};
