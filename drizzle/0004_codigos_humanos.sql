ALTER TABLE "listas_verificacao"
ADD COLUMN "codigo" bigint GENERATED ALWAYS AS IDENTITY;

ALTER TABLE "campos_lista_verificacao"
ADD COLUMN "codigo" bigint GENERATED ALWAYS AS IDENTITY;

ALTER TABLE "respostas_lista_verificacao"
ADD COLUMN "codigo" bigint GENERATED ALWAYS AS IDENTITY;

ALTER TABLE "listas_verificacao"
ADD CONSTRAINT "listas_verificacao_codigo_unique" UNIQUE ("codigo");

ALTER TABLE "campos_lista_verificacao"
ADD CONSTRAINT "campos_lista_verificacao_codigo_unique" UNIQUE ("codigo");

ALTER TABLE "respostas_lista_verificacao"
ADD CONSTRAINT "respostas_lista_verificacao_codigo_unique" UNIQUE ("codigo");
