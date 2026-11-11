ALTER TABLE "permissoes_categoria"
ADD COLUMN IF NOT EXISTS "interagir_todas_demandas_checklist" boolean DEFAULT false NOT NULL;
