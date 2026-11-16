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
  outcome: "success" | "failure" | null;
  createdAt: string;
  stages: Record<StageKey, StageStatus>;
};

export function identifyStage(title: string): StageKey | null {
  const normalized = normalizeStageTitle(title);
  if (normalized.includes("desmont")) return "disassembly";
  if (normalized.includes("impermeab")) return "waterproofing";
  if (normalized.includes("separ")) return "separation";
  if (normalized.includes("entrega") || normalized.includes("entregue") || normalized.includes("transito")) return "delivery";
  if (normalized.includes("montag") || normalized.includes("montad")) return "assembly";
  return null;
}

export function isStageApplicabilityQuestion(title: string) {
  const normalized = normalizeStageTitle(title);
  return /\b(possui|tem|contem|existe|necessita)\b/.test(normalized) || normalized.includes("precisa de") || normalized.includes("ha ");
}

export function identifyStageStatusStep(title: string): StageKey | null {
  const normalized = normalizeStageTitle(title);
  const stage = identifyStage(title);
  if (!stage || isStageApplicabilityQuestion(title)) return stage;
  if (stage === "separation") return /separacao (realizada|concluida)|separado com sucesso/.test(normalized) ? stage : null;
  if (stage === "disassembly") return /desmontagem (realizada|concluida)|desmontado com sucesso/.test(normalized) ? stage : null;
  if (stage === "waterproofing") return /impermeabilizacao (realizada|concluida)|impermeabilizado com sucesso/.test(normalized) ? stage : null;
  if (stage === "delivery") return /(pedido entregue|entrega realizada|entregue com sucesso)/.test(normalized) ? stage : null;
  if (stage === "assembly") return /montagem (realizada|concluida)|montado com sucesso/.test(normalized) ? stage : null;
  return null;
}

export function identifyItemConferenceStage(title: string): StageKey | null {
  const normalized = normalizeStageTitle(title);
  if (/conferencia.*produto|produto.*confer/.test(normalized)) return "separation";
  return identifyStage(title);
}

export function isFailedStageAnswer(answer: unknown) {
  if (answer === false || answer === 0) return true;
  if (typeof answer !== "string") return false;
  const normalized = normalizeStageTitle(answer).trim();
  return /^(false|0|n|nao|retorno|devolvid[oa]|cancelad[oa]|insucesso|falha|nao entregue|nao realizad[oa])(?:\b|$)/.test(normalized);
}

export function calculateStageSuccess(stages: Record<StageKey, StageStatus>) {
  const applicable = Object.values(stages).filter((status) => status !== "notApplicable");
  if (!applicable.length) return 0;
  const score = applicable.reduce((total, status) => total + (status === "completed" ? 1 : status === "partiallyCompleted" ? .5 : 0), 0);
  return Math.round((score / applicable.length) * 100);
}

function normalizeStageTitle(title: string) { return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
