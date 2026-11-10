ALTER TABLE "nos_fluxo_checklist" ADD COLUMN IF NOT EXISTS "responder_por_item" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "respostas_itens_etapa_checklist" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "respostas_itens_etapa_checklist_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id_execucao" uuid NOT NULL,
	"id_no" uuid NOT NULL,
	"indice_item" integer NOT NULL,
	"codigo_produto" text NOT NULL,
	"descricao_produto" text NOT NULL,
	"quantidade" text NOT NULL,
	"sucesso" boolean NOT NULL,
	"observacao" text,
	"id_usuario" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "respostas_itens_etapa_execucao_no_item_idx" UNIQUE("id_execucao","id_no","indice_item")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "respostas_itens_etapa_checklist" ADD CONSTRAINT "respostas_itens_etapa_checklist_id_execucao_execucoes_checklist_id_fk" FOREIGN KEY ("id_execucao") REFERENCES "public"."execucoes_checklist"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "respostas_itens_etapa_checklist" ADD CONSTRAINT "respostas_itens_etapa_checklist_id_no_nos_fluxo_checklist_id_fk" FOREIGN KEY ("id_no") REFERENCES "public"."nos_fluxo_checklist"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "respostas_itens_etapa_checklist" ADD CONSTRAINT "respostas_itens_etapa_checklist_id_usuario_usuarios_id_fk" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "respostas_itens_etapa_produto_resultado_idx" ON "respostas_itens_etapa_checklist" USING btree ("codigo_produto","sucesso");
