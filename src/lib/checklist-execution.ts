import type { checklistFields } from "@/db/schema";

type ChecklistField = typeof checklistFields.$inferSelect;

export function answerIsEmpty(value: unknown) {
  return value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
}

export function validateChecklistAnswers(fields: ChecklistField[], answers: Record<string, unknown>, completing: boolean) {
  const fieldIds = new Set(fields.map((field) => field.id));
  const unknown = Object.keys(answers).find((id) => !fieldIds.has(id));
  if (unknown) return `A resposta contém um campo que não pertence a este checklist.`;
  for (const field of fields) {
    const value = answers[field.id];
    if (completing && field.required && answerIsEmpty(value)) return `Preencha o campo obrigatório: ${field.label}.`;
    if (answerIsEmpty(value)) continue;
    if ((field.type === "short_text" || field.type === "long_text" || field.type === "date" || field.type === "single_select") && typeof value !== "string") return `Resposta inválida em ${field.label}.`;
    if (field.type === "multi_select" && (!Array.isArray(value) || value.some((item) => typeof item !== "string"))) return `Resposta inválida em ${field.label}.`;
    if (field.type === "boolean" && typeof value !== "boolean") return `Resposta inválida em ${field.label}.`;
    if (field.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) return `Resposta inválida em ${field.label}.`;
  }
  return null;
}
