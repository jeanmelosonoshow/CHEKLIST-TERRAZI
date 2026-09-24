export type HumanCodePrefix = "CHK" | "CMP" | "RSP";

export function formatHumanCode(prefix: HumanCodePrefix, code: number) {
  return `${prefix}-${String(code).padStart(6, "0")}`;
}
