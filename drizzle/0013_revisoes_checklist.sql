ALTER TYPE "status_lista_verificacao" ADD VALUE IF NOT EXISTS 'revoked';

ALTER TABLE "listas_verificacao"
ADD COLUMN "id_lista_origem" uuid,
ADD COLUMN "versao" integer DEFAULT 1 NOT NULL;

ALTER TABLE "listas_verificacao"
ADD CONSTRAINT "listas_verificacao_id_lista_origem_fk"
FOREIGN KEY ("id_lista_origem") REFERENCES "listas_verificacao"("id");

CREATE INDEX "listas_verificacao_origem_versao_idx"
ON "listas_verificacao" ("id_lista_origem", "versao");
