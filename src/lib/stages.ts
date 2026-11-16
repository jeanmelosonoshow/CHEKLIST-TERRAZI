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
  successPercentage: number;
  checklistStatus: "pending" | "in_progress" | "completed";
  createdAt: string;
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

export function identifyStageStatusStep(title: string): StageKey | null {
  const normalized = normalizeStageTitle(title);
  if (/feedback|satisfacao|pesquisa|deseja registrar/.test(normalized)) return null;
  if (/conferencia.*produto|produto.*confer/.test(normalized)) return "separation";
  const stage = identifyStage(title);
  if (!stage || isStageApplicabilityQuestion(title)) return stage;
  if (stage === "delivery" && !/(pedido entregue|entrega realizada|entregue|realizada.*entrega)/.test(normalized)) return null;
  return stage;
}

export function calculateStageSuccess(stages: Record<StageKey, StageStatus>) {
  const applicable = Object.values(stages).filter((status) => status !== "notApplicable");
  if (!applicable.length) return 0;
  const score = applicable.reduce((total, status) => total + (status === "completed" ? 1 : status === "partiallyCompleted" ? .5 : 0), 0);
  return Math.round((score / applicable.length) * 100);
}

function normalizeStageTitle(title: string) { return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
