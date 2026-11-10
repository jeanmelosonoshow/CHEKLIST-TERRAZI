export type SaleItemSnapshot = { code: string; description: string; quantity: string | number };
export type ItemizedAnswerInput = { itemIndex: number; success: boolean; observation?: string | null };

export type PreparedItemizedAnswer = ItemizedAnswerInput & {
  productCode: string;
  productDescription: string;
  quantity: string;
};

export function prepareItemizedAnswers(items: SaleItemSnapshot[], answers: ItemizedAnswerInput[], requireAll: boolean) {
  if (!items.length) return { error: "A venda não possui produtos disponíveis para esta etapa.", answers: [] as PreparedItemizedAnswer[] };
  const seen = new Set<number>();
  const normalized: PreparedItemizedAnswer[] = [];
  for (const answer of answers) {
    if (seen.has(answer.itemIndex)) return { error: "Existe mais de uma sinalização para o mesmo produto.", answers: [] as PreparedItemizedAnswer[] };
    const item = items[answer.itemIndex];
    if (!item) return { error: "Um dos produtos sinalizados não pertence a esta venda.", answers: [] as PreparedItemizedAnswer[] };
    seen.add(answer.itemIndex);
    normalized.push({
      itemIndex: answer.itemIndex,
      productCode: String(item.code),
      productDescription: String(item.description),
      quantity: String(item.quantity),
      success: answer.success,
      observation: answer.observation?.trim() || null,
    });
  }
  if (requireAll && seen.size !== items.length) return { error: `Sinalize todos os ${items.length} produtos antes de concluir a etapa.`, answers: normalized };
  return { answers: normalized, aggregate: normalized.length === items.length && normalized.every((answer) => answer.success) };
}
