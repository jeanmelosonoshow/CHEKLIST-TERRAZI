ALTER TYPE "condicao_fluxo_checklist" ADD VALUE IF NOT EXISTS 'greater_than';
ALTER TYPE "condicao_fluxo_checklist" ADD VALUE IF NOT EXISTS 'greater_or_equal';
ALTER TYPE "condicao_fluxo_checklist" ADD VALUE IF NOT EXISTS 'less_than';
ALTER TYPE "condicao_fluxo_checklist" ADD VALUE IF NOT EXISTS 'less_or_equal';

ALTER TABLE "nos_fluxo_checklist"
ADD COLUMN "campo_resultado_cliente" text;
