DO $$ BEGIN
 CREATE TYPE "public"."origem_dados_relatorio" AS ENUM('firebird', 'postgres', 'hybrid');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."modo_combinacao_relatorio" AS ENUM('append', 'join');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "relatorios_configuraveis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "titulo" text NOT NULL, "descricao" text,
	"origem_dados" "origem_dados_relatorio" NOT NULL, "sql_principal" text NOT NULL, "sql_secundario" text,
	"modo_combinacao" "modo_combinacao_relatorio" DEFAULT 'append' NOT NULL, "campos_uniao" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL, "criado_por" uuid NOT NULL, "atualizado_por" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL, "atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "relatorios_configuraveis" ADD CONSTRAINT "relatorios_configuraveis_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "relatorios_configuraveis" ADD CONSTRAINT "relatorios_configuraveis_atualizado_por_usuarios_id_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "relatorios_configuraveis_ativo_titulo_idx" ON "relatorios_configuraveis" USING btree ("ativo","titulo");
