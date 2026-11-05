CREATE TYPE "tipo_no_fluxo_checklist" AS ENUM ('start', 'question', 'automatic_decision', 'action', 'observation', 'end');
CREATE TYPE "condicao_fluxo_checklist" AS ENUM ('always', 'equals', 'not_equals');
CREATE TYPE "resultado_fluxo_checklist" AS ENUM ('success', 'failure');
CREATE TYPE "origem_automacao_checklist" AS ENUM ('postgres', 'firebird');

CREATE TABLE "nos_fluxo_checklist" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "codigo" bigint GENERATED ALWAYS AS IDENTITY NOT NULL UNIQUE,
  "id_lista_verificacao" uuid NOT NULL REFERENCES "listas_verificacao"("id") ON DELETE CASCADE,
  "chave_no" text NOT NULL,
  "tipo" "tipo_no_fluxo_checklist" NOT NULL,
  "titulo" text NOT NULL,
  "descricao" text,
  "tipo_campo" "tipo_campo_lista_verificacao",
  "obrigatorio" boolean DEFAULT false NOT NULL,
  "chave_fonte" text REFERENCES "fontes_sincronizadas"("chave"),
  "origem_automacao" "origem_automacao_checklist",
  "sql_consulta" text,
  "campo_resultado" text DEFAULT 'RESULTADO' NOT NULL,
  "resultado_final" "resultado_fluxo_checklist",
  "posicao" integer NOT NULL,
  "configuracao" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "criado_em" timestamptz DEFAULT now() NOT NULL,
  "atualizado_em" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "nos_fluxo_checklist_chave_idx" ON "nos_fluxo_checklist" ("id_lista_verificacao", "chave_no");
CREATE INDEX "nos_fluxo_checklist_ordem_idx" ON "nos_fluxo_checklist" ("id_lista_verificacao", "posicao");

CREATE TABLE "conexoes_fluxo_checklist" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "id_lista_verificacao" uuid NOT NULL REFERENCES "listas_verificacao"("id") ON DELETE CASCADE,
  "id_no_origem" uuid NOT NULL REFERENCES "nos_fluxo_checklist"("id") ON DELETE CASCADE,
  "id_no_destino" uuid NOT NULL REFERENCES "nos_fluxo_checklist"("id") ON DELETE CASCADE,
  "condicao" "condicao_fluxo_checklist" DEFAULT 'always' NOT NULL,
  "valor_condicao" jsonb,
  "rotulo" text,
  "prioridade" integer DEFAULT 0 NOT NULL
);
CREATE INDEX "conexoes_fluxo_checklist_origem_idx" ON "conexoes_fluxo_checklist" ("id_no_origem", "prioridade");

ALTER TABLE "execucoes_checklist"
ADD COLUMN "id_no_atual" uuid REFERENCES "nos_fluxo_checklist"("id"),
ADD COLUMN "resultado" "resultado_fluxo_checklist";

CREATE TABLE "passos_execucao_fluxo_checklist" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "id_execucao" uuid NOT NULL REFERENCES "execucoes_checklist"("id") ON DELETE CASCADE,
  "id_no" uuid NOT NULL REFERENCES "nos_fluxo_checklist"("id"),
  "resposta" jsonb,
  "observacao" text,
  "automatico" boolean DEFAULT false NOT NULL,
  "id_proximo_no" uuid REFERENCES "nos_fluxo_checklist"("id"),
  "id_usuario" uuid NOT NULL REFERENCES "usuarios"("id"),
  "criado_em" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "passos_execucao_fluxo_execucao_idx" ON "passos_execucao_fluxo_checklist" ("id_execucao", "criado_em");
