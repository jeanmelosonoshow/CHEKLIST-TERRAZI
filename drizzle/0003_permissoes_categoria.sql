CREATE TABLE "permissoes_categoria" (
  "categoria" text PRIMARY KEY NOT NULL,
  "visualizar_checklist" boolean DEFAULT false NOT NULL,
  "incluir_checklist" boolean DEFAULT false NOT NULL,
  "editar_checklist" boolean DEFAULT false NOT NULL,
  "relatorios" boolean DEFAULT false NOT NULL,
  "dashboard" boolean DEFAULT false NOT NULL,
  "criado_em" timestamptz DEFAULT now() NOT NULL,
  "atualizado_em" timestamptz DEFAULT now() NOT NULL
);
