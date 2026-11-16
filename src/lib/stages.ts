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
  checklistTitle?: string;
  currentStage?: string | null;
  stages: Record<StageKey, StageStatus>;
};

export function identifyStage(title: string): StageKey | null {
  const normalized = normalizeStageTitle(title);
  if (normalized.includes("desmont")) return "disassembly";
  if (normalized.includes("impermeab")) return "waterproofing";
  if (normalized.includes("separ")) return "separation";
  if (normalized.includes("entrega") || normalized.includes("entregue") || normalized.includes("transito")) return "delivery";
  if (normalized.includes("montag")) return "assembly";
  return null;
}

export function isStageApplicabilityQuestion(title: string) {
  const normalized = normalizeStageTitle(title);
  return /\b(possui|tem|contem|existe|necessita)\b/.test(normalized) || normalized.includes("precisa de") || normalized.includes("ha ");
}

function normalizeStageTitle(title: string) { return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
