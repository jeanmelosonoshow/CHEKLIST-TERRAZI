ALTER TABLE "nos_fluxo_checklist"
ADD COLUMN "campo_resultado_codigo_produto" text,
ADD COLUMN "campo_resultado_descricao_produto" text,
ADD COLUMN "campo_resultado_quantidade_produto" text;

ALTER TABLE "execucoes_checklist"
ADD COLUMN "itens_venda" jsonb DEFAULT '[]'::jsonb NOT NULL,
ADD COLUMN "resposta_rascunho" jsonb,
ADD COLUMN "observacao_rascunho" text;
