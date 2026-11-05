CREATE TYPE "visualizacao_cenario_dashboard" AS ENUM ('metric', 'bar', 'donut', 'table');

CREATE TABLE "cenarios_dashboard" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "titulo" text NOT NULL,
  "descricao" text,
  "visualizacao" "visualizacao_cenario_dashboard" DEFAULT 'metric' NOT NULL,
  "sql_resumo" text NOT NULL,
  "sql_detalhe" text,
  "campo_rotulo" text,
  "campo_valor" text DEFAULT 'QUANTIDADE' NOT NULL,
  "cor" text DEFAULT '#126b50' NOT NULL,
  "posicao" integer DEFAULT 0 NOT NULL,
  "ativo" boolean DEFAULT true NOT NULL,
  "versao" integer DEFAULT 1 NOT NULL,
  "criado_por" uuid NOT NULL REFERENCES "usuarios"("id"),
  "atualizado_por" uuid NOT NULL REFERENCES "usuarios"("id"),
  "criado_em" timestamptz DEFAULT now() NOT NULL,
  "atualizado_em" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "cenarios_dashboard_ativo_posicao_idx"
ON "cenarios_dashboard" ("ativo", "posicao");

CREATE TABLE "historico_cenarios_dashboard" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "id_cenario" uuid NOT NULL REFERENCES "cenarios_dashboard"("id") ON DELETE CASCADE,
  "versao" integer NOT NULL,
  "configuracao" jsonb NOT NULL,
  "alterado_por" uuid NOT NULL REFERENCES "usuarios"("id"),
  "alterado_em" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "historico_cenarios_dashboard_cenario_versao_idx"
ON "historico_cenarios_dashboard" ("id_cenario", "versao");
