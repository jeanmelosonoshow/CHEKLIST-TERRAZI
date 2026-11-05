ALTER TABLE "cenarios_dashboard"
ADD COLUMN "formatos_colunas" jsonb DEFAULT '[]'::jsonb NOT NULL;
