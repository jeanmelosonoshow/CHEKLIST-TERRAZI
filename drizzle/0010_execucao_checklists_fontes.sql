CREATE TYPE "tipo_fonte_opcoes" AS ENUM ('synchronized', 'static', 'postgres', 'firebird');
CREATE TYPE "status_execucao_checklist" AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

ALTER TABLE "fontes_sincronizadas"
ADD COLUMN "tipo_fonte" "tipo_fonte_opcoes" DEFAULT 'synchronized' NOT NULL,
ADD COLUMN "sql_consulta" text,
ADD COLUMN "campo_valor_resultado" text DEFAULT 'VALUE' NOT NULL,
ADD COLUMN "campo_rotulo_resultado" text DEFAULT 'LABEL' NOT NULL,
ADD COLUMN "opcoes_estaticas" jsonb DEFAULT '[]'::jsonb NOT NULL;

CREATE TABLE "execucoes_checklist" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "codigo" bigint GENERATED ALWAYS AS IDENTITY NOT NULL UNIQUE,
  "id_lista_verificacao" uuid NOT NULL REFERENCES "listas_verificacao"("id"),
  "id_filial" text NOT NULL,
  "numero_venda" text NOT NULL,
  "nome_cliente" text,
  "status" "status_execucao_checklist" DEFAULT 'pending' NOT NULL,
  "atribuido_a" uuid NOT NULL REFERENCES "usuarios"("id"),
  "criado_por" uuid NOT NULL REFERENCES "usuarios"("id"),
  "iniciado_em" timestamptz,
  "finalizado_em" timestamptz,
  "criado_em" timestamptz DEFAULT now() NOT NULL,
  "atualizado_em" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "execucoes_checklist_filial_venda_idx"
ON "execucoes_checklist" ("id_filial", "numero_venda");

CREATE INDEX "execucoes_checklist_status_responsavel_idx"
ON "execucoes_checklist" ("status", "atribuido_a");

CREATE UNIQUE INDEX "execucoes_checklist_ativa_venda_idx"
ON "execucoes_checklist" ("id_lista_verificacao", "id_filial", "numero_venda")
WHERE "status" IN ('pending', 'in_progress');

ALTER TABLE "respostas_lista_verificacao"
ADD COLUMN "id_execucao" uuid REFERENCES "execucoes_checklist"("id") ON DELETE CASCADE;

CREATE UNIQUE INDEX "respostas_lista_verificacao_execucao_idx"
ON "respostas_lista_verificacao" ("id_execucao");

CREATE TABLE "eventos_execucao_checklist" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "id_execucao" uuid NOT NULL REFERENCES "execucoes_checklist"("id") ON DELETE CASCADE,
  "evento" text NOT NULL,
  "id_usuario" uuid NOT NULL REFERENCES "usuarios"("id"),
  "dados" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "criado_em" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "eventos_execucao_checklist_execucao_idx"
ON "eventos_execucao_checklist" ("id_execucao", "criado_em");
