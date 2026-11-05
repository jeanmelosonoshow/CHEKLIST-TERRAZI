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
import { sql } from "drizzle-orm";

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
export const optionSourceTypeEnum = pgEnum("tipo_fonte_opcoes", ["synchronized", "static", "postgres", "firebird"]);
export const checklistExecutionStatusEnum = pgEnum("status_execucao_checklist", ["pending", "in_progress", "completed", "cancelled"]);
export const checklistFlowNodeTypeEnum = pgEnum("tipo_no_fluxo_checklist", ["start", "question", "automatic_decision", "action", "observation", "end"]);
export const checklistFlowConditionEnum = pgEnum("condicao_fluxo_checklist", ["always", "equals", "not_equals"]);
export const checklistFlowOutcomeEnum = pgEnum("resultado_fluxo_checklist", ["success", "failure"]);
export const checklistAutomationSourceEnum = pgEnum("origem_automacao_checklist", ["postgres", "firebird"]);
export const dashboardVisualizationEnum = pgEnum("visualizacao_cenario_dashboard", [
  "metric",
  "bar",
  "donut",
  "table",
]);
export const dashboardDisplayFormatEnum = pgEnum("formato_exibicao_dashboard", [
  "auto",
  "text",
  "integer",
  "decimal",
  "currency_brl",
  "percent",
  "date_short",
  "date_long",
  "datetime",
  "month_year",
  "month_name",
  "weekday",
]);

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
    uniqueIndex("usuarios_login_idx").on(sql`lower(${table.login})`),
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
  stages: boolean("etapas").default(false).notNull(),
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
  sourceType: optionSourceTypeEnum("tipo_fonte").default("synchronized").notNull(),
  querySql: text("sql_consulta"),
  resultValueField: text("campo_valor_resultado").default("VALUE").notNull(),
  resultLabelField: text("campo_rotulo_resultado").default("LABEL").notNull(),
  staticOptions: jsonb("opcoes_estaticas").$type<Array<{ value: string; label: string }>>().default([]).notNull(),
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

export const checklistFlowNodes = pgTable(
  "nos_fluxo_checklist",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: bigint("codigo", { mode: "number" }).generatedAlwaysAsIdentity().notNull().unique(),
    checklistId: uuid("id_lista_verificacao").notNull().references(() => checklists.id, { onDelete: "cascade" }),
    nodeKey: text("chave_no").notNull(),
    type: checklistFlowNodeTypeEnum("tipo").notNull(),
    title: text("titulo").notNull(),
    description: text("descricao"),
    fieldType: fieldTypeEnum("tipo_campo"),
    required: boolean("obrigatorio").default(false).notNull(),
    sourceKey: text("chave_fonte").references(() => syncedSources.key),
    automationSource: checklistAutomationSourceEnum("origem_automacao"),
    querySql: text("sql_consulta"),
    resultField: text("campo_resultado").default("RESULTADO").notNull(),
    outcome: checklistFlowOutcomeEnum("resultado_final"),
    position: integer("posicao").notNull(),
    configuration: jsonb("configuracao").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("atualizado_em", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("nos_fluxo_checklist_chave_idx").on(table.checklistId, table.nodeKey),
    index("nos_fluxo_checklist_ordem_idx").on(table.checklistId, table.position),
  ],
);

export const checklistFlowEdges = pgTable(
  "conexoes_fluxo_checklist",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    checklistId: uuid("id_lista_verificacao").notNull().references(() => checklists.id, { onDelete: "cascade" }),
    sourceNodeId: uuid("id_no_origem").notNull().references(() => checklistFlowNodes.id, { onDelete: "cascade" }),
    targetNodeId: uuid("id_no_destino").notNull().references(() => checklistFlowNodes.id, { onDelete: "cascade" }),
    condition: checklistFlowConditionEnum("condicao").default("always").notNull(),
    conditionValue: jsonb("valor_condicao").$type<unknown>(),
    label: text("rotulo"),
    priority: integer("prioridade").default(0).notNull(),
  },
  (table) => [index("conexoes_fluxo_checklist_origem_idx").on(table.sourceNodeId, table.priority)],
);

export const checklistExecutions = pgTable(
  "execucoes_checklist",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: bigint("codigo", { mode: "number" }).generatedAlwaysAsIdentity().notNull().unique(),
    checklistId: uuid("id_lista_verificacao").notNull().references(() => checklists.id),
    branchId: text("id_filial").notNull(),
    saleNumber: text("numero_venda").notNull(),
    customerName: text("nome_cliente"),
    status: checklistExecutionStatusEnum("status").default("pending").notNull(),
    currentNodeId: uuid("id_no_atual").references(() => checklistFlowNodes.id),
    outcome: checklistFlowOutcomeEnum("resultado"),
    assignedTo: uuid("atribuido_a").notNull().references(() => users.id),
    createdBy: uuid("criado_por").notNull().references(() => users.id),
    startedAt: timestamp("iniciado_em", { withTimezone: true }),
    completedAt: timestamp("finalizado_em", { withTimezone: true }),
    createdAt: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("atualizado_em", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("execucoes_checklist_filial_venda_idx").on(table.branchId, table.saleNumber),
    index("execucoes_checklist_status_responsavel_idx").on(table.status, table.assignedTo),
    uniqueIndex("execucoes_checklist_ativa_venda_idx").on(table.checklistId, table.branchId, table.saleNumber)
      .where(sql`${table.status} in ('pending', 'in_progress')`),
  ],
);

export const checklistFlowSteps = pgTable(
  "passos_execucao_fluxo_checklist",
  {
    id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    executionId: uuid("id_execucao").notNull().references(() => checklistExecutions.id, { onDelete: "cascade" }),
    nodeId: uuid("id_no").notNull().references(() => checklistFlowNodes.id),
    answer: jsonb("resposta").$type<unknown>(),
    observation: text("observacao"),
    automatic: boolean("automatico").default(false).notNull(),
    nextNodeId: uuid("id_proximo_no").references(() => checklistFlowNodes.id),
    userId: uuid("id_usuario").notNull().references(() => users.id),
    createdAt: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("passos_execucao_fluxo_execucao_idx").on(table.executionId, table.createdAt)],
);

export const checklistResponses = pgTable(
  "respostas_lista_verificacao",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: bigint("codigo", { mode: "number" }).generatedAlwaysAsIdentity().notNull().unique(),
    checklistId: uuid("id_lista_verificacao").notNull().references(() => checklists.id),
    executionId: uuid("id_execucao").references(() => checklistExecutions.id, { onDelete: "cascade" }),
    userId: uuid("id_usuario").notNull().references(() => users.id),
    answers: jsonb("respostas").$type<Record<string, unknown>>().default({}).notNull(),
    submittedAt: timestamp("enviado_em", { withTimezone: true }),
    createdAt: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("atualizado_em", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("respostas_lista_verificacao_execucao_idx").on(table.executionId)],
);

export const checklistExecutionEvents = pgTable(
  "eventos_execucao_checklist",
  {
    id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    executionId: uuid("id_execucao").notNull().references(() => checklistExecutions.id, { onDelete: "cascade" }),
    event: text("evento").notNull(),
    userId: uuid("id_usuario").notNull().references(() => users.id),
    data: jsonb("dados").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("eventos_execucao_checklist_execucao_idx").on(table.executionId, table.createdAt)],
);

export const dashboardScenarios = pgTable(
  "cenarios_dashboard",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("titulo").notNull(),
    description: text("descricao"),
    visualization: dashboardVisualizationEnum("visualizacao").default("metric").notNull(),
    summarySql: text("sql_resumo").notNull(),
    detailSql: text("sql_detalhe"),
    labelField: text("campo_rotulo"),
    valueField: text("campo_valor").default("QUANTIDADE").notNull(),
    labelFormat: dashboardDisplayFormatEnum("formato_rotulo").default("text").notNull(),
    valueFormat: dashboardDisplayFormatEnum("formato_valor").default("auto").notNull(),
    columnFormats: jsonb("formatos_colunas").$type<Array<{
      field: string;
      format: typeof dashboardDisplayFormatEnum.enumValues[number];
      scope: "summary" | "detail" | "both";
    }>>().default([]).notNull(),
    color: text("cor").default("#126b50").notNull(),
    position: integer("posicao").default(0).notNull(),
    active: boolean("ativo").default(true).notNull(),
    version: integer("versao").default(1).notNull(),
    createdBy: uuid("criado_por").notNull().references(() => users.id),
    updatedBy: uuid("atualizado_por").notNull().references(() => users.id),
    createdAt: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("atualizado_em", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("cenarios_dashboard_ativo_posicao_idx").on(table.active, table.position)],
);

export const dashboardScenarioHistory = pgTable(
  "historico_cenarios_dashboard",
  {
    id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    scenarioId: uuid("id_cenario").notNull().references(() => dashboardScenarios.id, { onDelete: "cascade" }),
    version: integer("versao").notNull(),
    configuration: jsonb("configuracao").$type<Record<string, unknown>>().notNull(),
    changedBy: uuid("alterado_por").notNull().references(() => users.id),
    changedAt: timestamp("alterado_em", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("historico_cenarios_dashboard_cenario_versao_idx").on(table.scenarioId, table.version)],
);

export type User = typeof users.$inferSelect;
