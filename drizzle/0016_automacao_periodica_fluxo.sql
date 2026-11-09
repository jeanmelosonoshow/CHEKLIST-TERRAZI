ALTER TABLE "nos_fluxo_checklist"
ADD COLUMN "intervalo_automatico_minutos" integer;

ALTER TABLE "execucoes_checklist"
ADD COLUMN "proxima_automacao_em" timestamp with time zone,
ADD COLUMN "ultima_automacao_em" timestamp with time zone;

CREATE INDEX "execucoes_checklist_automacao_idx"
ON "execucoes_checklist" ("proxima_automacao_em", "status");

ALTER TABLE "nos_fluxo_checklist"
ADD CONSTRAINT "nos_fluxo_checklist_intervalo_automatico_check"
CHECK ("intervalo_automatico_minutos" IS NULL OR "intervalo_automatico_minutos" BETWEEN 5 AND 10080);
