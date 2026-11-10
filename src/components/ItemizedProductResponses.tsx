"use client";

import type { SaleItem } from "./SaleItemsTable";

export type ProductResponse = { success: boolean; observation: string };
export type ProductResponses = Record<number, ProductResponse>;

export function ItemizedProductResponses({ items, answers, disabled, onChange }: { items: SaleItem[]; answers: ProductResponses; disabled?: boolean; onChange: (answers: ProductResponses) => void }) {
  const answered = Object.keys(answers).length;
  if (!items.length) return <p className="formError">A venda não possui produtos disponíveis para esta etapa.</p>;
  return <div className="itemizedResponses">
    <div className="itemizedProgress"><strong>Conferência por produto</strong><span>{answered} de {items.length} sinalizado(s)</span></div>
    {items.map((item, itemIndex) => {
      const answer = answers[itemIndex];
      const update = (patch: Partial<ProductResponse>) => onChange({ ...answers, [itemIndex]: { success: answer?.success ?? true, observation: answer?.observation ?? "", ...patch } });
      return <article className="itemizedProductCard" key={`${item.code}-${itemIndex}`}>
        <div className="itemizedProductHeader"><span><small>Código</small><strong>{item.code}</strong></span><span><small>Quantidade</small><strong>{item.quantity}</strong></span></div>
        <p>{item.description}</p>
        <div className="itemizedStatusChoices">
          <button type="button" disabled={disabled} className={answer?.success === true ? "success selected" : "success"} onClick={() => update({ success: true })}>✓ Sucesso</button>
          <button type="button" disabled={disabled} className={answer?.success === false ? "failure selected" : "failure"} onClick={() => update({ success: false })}>× Insucesso</button>
        </div>
        <label>Observação do produto<textarea disabled={disabled || !answer} rows={2} value={answer?.observation || ""} onChange={(event) => update({ observation: event.target.value })} placeholder="Opcional: descreva a ocorrência" /></label>
      </article>;
    })}
  </div>;
}
