"use client";

export type SaleItem = { code: string; description: string; quantity: string | number };

export function SaleItemsTable({ items }: { items: SaleItem[] }) {
  if (!items.length) return null;
  return <div className="saleItems"><div className="saleItemsHeader"><strong>Produtos da saída</strong><span>{items.length} item(ns)</span></div><div className="tableWrap"><table><thead><tr><th>Código</th><th>Descrição do produto</th><th>Qtde.</th></tr></thead><tbody>{items.map((item, index) => <tr key={`${item.code}-${index}`}><td>{item.code}</td><td>{item.description}</td><td>{item.quantity}</td></tr>)}</tbody></table></div></div>;
}
