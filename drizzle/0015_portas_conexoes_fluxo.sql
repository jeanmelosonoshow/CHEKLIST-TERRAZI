ALTER TABLE "conexoes_fluxo_checklist"
ADD COLUMN "porta_origem" text DEFAULT 'right' NOT NULL,
ADD COLUMN "porta_destino" text DEFAULT 'left' NOT NULL;
