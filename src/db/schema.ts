import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const fieldTypeEnum = pgEnum("tipo_campo_lista_verificacao", [
  "short_text",
  "long_text",
  "number",
  "date",
  "boolean",
  "single_select",
  "multi_select",
]);
export const checklistStatusEnum = pgEnum("status_lista_verificacao", ["draft", "published", "archived"]);
export const syncStatusEnum = pgEnum("status_sincronizacao", ["running", "success", "failed"]);

export const users = pgTable(
  "usuarios",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    branchId: text("id_filial").notNull(),
    category: text("categoria"),
    employeeId: integer("id_funcionario").notNull(),
    employeeName: text("nome_funcionario").notNull(),
    login: text("login").notNull(),
    passwordHash: text("hash_senha").notNull(),
    active: boolean("ativo").default(true).notNull(),
    isAdmin: boolean("administrador").default(false).notNull(),
    sourceUpdatedAt: timestamp("atualizado_origem_em", { withTimezone: true }),
    lastSyncedAt: timestamp("ultima_sincronizacao_em", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("atualizado_em", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("usuarios_id_funcionario_idx").on(table.employeeId),
    uniqueIndex("usuarios_login_idx").on(table.login),
    index("usuarios_ativo_idx").on(table.active),
  ],
);

export const categoryPermissions = pgTable("permissoes_categoria", {
  category: text("categoria").primaryKey(),
  viewChecklist: boolean("visualizar_checklist").default(false).notNull(),
  createChecklist: boolean("incluir_checklist").default(false).notNull(),
  editChecklist: boolean("editar_checklist").default(false).notNull(),
  reports: boolean("relatorios").default(false).notNull(),
  dashboard: boolean("dashboard").default(false).notNull(),
  createdAt: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("atualizado_em", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable(
  "sessoes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tokenHash: text("hash_token").notNull(),
    userId: uuid("id_usuario").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expira_em", { withTimezone: true }).notNull(),
    createdAt: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("ultimo_acesso_em", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("sessoes_hash_token_idx").on(table.tokenHash), index("sessoes_id_usuario_idx").on(table.userId)],
);

export const syncRuns = pgTable("execucoes_sincronizacao", {
  id: uuid("id").defaultRandom().primaryKey(),
  source: text("origem").notNull(),
  status: syncStatusEnum("status").default("running").notNull(),
  receivedCount: integer("quantidade_recebida").default(0).notNull(),
  processedCount: integer("quantidade_processada").default(0).notNull(),
  errorMessage: text("mensagem_erro"),
  startedAt: timestamp("iniciado_em", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("concluido_em", { withTimezone: true }),
});

export const syncedSources = pgTable("fontes_sincronizadas", {
  key: text("chave").primaryKey(),
  label: text("rotulo").notNull(),
  description: text("descricao"),
  active: boolean("ativo").default(true).notNull(),
  schema: jsonb("esquema").$type<Record<string, unknown>>().default({}).notNull(),
  lastSyncedAt: timestamp("ultima_sincronizacao_em", { withTimezone: true }),
  createdAt: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("atualizado_em", { withTimezone: true }).defaultNow().notNull(),
});

export const syncedRecords = pgTable(
  "registros_sincronizados",
  {
    sourceKey: text("chave_fonte").notNull().references(() => syncedSources.key, { onDelete: "cascade" }),
    externalId: text("id_externo").notNull(),
    label: text("rotulo").notNull(),
    data: jsonb("dados").$type<Record<string, unknown>>().default({}).notNull(),
    active: boolean("ativo").default(true).notNull(),
    lastSyncedAt: timestamp("ultima_sincronizacao_em", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.sourceKey, table.externalId] }),
    index("registros_sincronizados_fonte_ativo_idx").on(table.sourceKey, table.active),
  ],
);

export const checklists = pgTable("listas_verificacao", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: bigint("codigo", { mode: "number" }).generatedAlwaysAsIdentity().notNull().unique(),
  title: text("titulo").notNull(),
  description: text("descricao"),
  status: checklistStatusEnum("status").default("draft").notNull(),
  createdBy: uuid("criado_por").notNull().references(() => users.id),
  createdAt: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("atualizado_em", { withTimezone: true }).defaultNow().notNull(),
});

export const checklistFields = pgTable(
  "campos_lista_verificacao",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: bigint("codigo", { mode: "number" }).generatedAlwaysAsIdentity().notNull().unique(),
    checklistId: uuid("id_lista_verificacao").notNull().references(() => checklists.id, { onDelete: "cascade" }),
    label: text("rotulo").notNull(),
    description: text("descricao"),
    type: fieldTypeEnum("tipo").notNull(),
    required: boolean("obrigatorio").default(false).notNull(),
    position: integer("posicao").notNull(),
    sourceKey: text("chave_fonte").references(() => syncedSources.key),
    configuration: jsonb("configuracao").$type<Record<string, unknown>>().default({}).notNull(),
  },
  (table) => [index("campos_lista_verificacao_ordem_idx").on(table.checklistId, table.position)],
);

export const checklistFieldOptions = pgTable(
  "opcoes_campo_lista_verificacao",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fieldId: uuid("id_campo").notNull().references(() => checklistFields.id, { onDelete: "cascade" }),
    value: text("valor").notNull(),
    label: text("rotulo").notNull(),
    position: integer("posicao").notNull(),
    active: boolean("ativo").default(true).notNull(),
  },
  (table) => [index("opcoes_campo_lista_verificacao_ordem_idx").on(table.fieldId, table.position)],
);

export const checklistResponses = pgTable("respostas_lista_verificacao", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: bigint("codigo", { mode: "number" }).generatedAlwaysAsIdentity().notNull().unique(),
  checklistId: uuid("id_lista_verificacao").notNull().references(() => checklists.id),
  userId: uuid("id_usuario").notNull().references(() => users.id),
  answers: jsonb("respostas").$type<Record<string, unknown>>().default({}).notNull(),
  submittedAt: timestamp("enviado_em", { withTimezone: true }),
  createdAt: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("atualizado_em", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
