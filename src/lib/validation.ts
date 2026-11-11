import { z } from "zod";

const dashboardDisplayFormatSchema = z.enum([
  "auto", "text", "integer", "decimal", "currency_brl", "percent",
  "date_short", "date_long", "datetime", "month_year", "month_name", "weekday",
]);

export const loginSchema = z.object({
  login: z.string().trim().min(1).max(100).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(256),
});

export const syncUsersSchema = z.object({
  fullSnapshot: z.boolean().default(true),
  sourceTimestamp: z.coerce.date().optional(),
  users: z.array(z.object({
    idfilial: z.string().trim().min(1).max(120),
    categoria: z.string().trim().max(120).nullish(),
    idfuncionario: z.coerce.number().int().positive(),
    nomefuncionario: z.string().trim().min(1).max(200),
    login: z.string().trim().min(1).max(100).transform((value) => value.toLowerCase()),
    senha: z.string().trim().regex(/^[a-fA-F0-9]{32}$/, "senha must be an MD5 hash"),
  })).max(5000),
});

const fieldSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1).max(200),
  type: z.enum(["short_text", "long_text", "number", "date", "boolean", "single_select", "multi_select"]),
  required: z.boolean().default(false),
  sourceKey: z.string().trim().min(1).max(100).nullable().optional(),
});

const flowNodeSchema = z.object({
  id: z.string().uuid().optional(),
  nodeKey: z.string().trim().regex(/^[a-z0-9][a-z0-9_-]{1,99}$/),
  type: z.enum(["start", "question", "automatic_decision", "action", "observation", "end"]),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).nullish(),
  fieldType: z.enum(["short_text", "long_text", "number", "date", "boolean", "single_select", "multi_select"]).nullish(),
  required: z.boolean().default(false),
  responseByItem: z.boolean().default(false),
  sourceKey: z.string().trim().min(1).max(100).nullish(),
  automationSource: z.enum(["postgres", "firebird"]).nullish(),
  querySql: z.string().trim().max(50_000).nullish(),
  resultField: z.string().trim().min(1).max(100).default("RESULTADO"),
  autoIntervalMinutes: z.coerce.number().int().min(5).max(10_080).nullish(),
  customerResultField: z.string().trim().max(100).nullish(),
  productCodeField: z.string().trim().max(100).nullish(),
  productDescriptionField: z.string().trim().max(100).nullish(),
  productQuantityField: z.string().trim().max(100).nullish(),
  x: z.coerce.number().min(0).max(10000).optional(),
  y: z.coerce.number().min(0).max(10000).optional(),
  outcome: z.enum(["success", "failure"]).nullish(),
  position: z.coerce.number().int().min(0).max(10_000),
});
const flowEdgeSchema = z.object({
  sourceKey: z.string().trim().min(2).max(100), targetKey: z.string().trim().min(2).max(100),
  condition: z.enum(["always", "equals", "not_equals", "greater_than", "greater_or_equal", "less_than", "less_or_equal"]), conditionValue: z.unknown().optional(),
  label: z.string().trim().max(120).nullish(), sourcePort: z.enum(["top", "right", "bottom", "left"]).optional(), targetPort: z.enum(["top", "right", "bottom", "left"]).optional(), priority: z.coerce.number().int().min(0).max(1000),
});
export const checklistFlowSchema = z.object({ nodes: z.array(flowNodeSchema).min(2).max(200), edges: z.array(flowEdgeSchema).min(1).max(500) });

export const createChecklistSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(1000).optional(),
  fields: z.array(fieldSchema).max(100).default([]),
  flow: checklistFlowSchema.optional(),
}).superRefine((value, context) => { if (!value.flow && !value.fields.length) context.addIssue({ code: "custom", path: ["fields"], message: "Inclua perguntas ou configure um fluxo." }); });

export const updateChecklistSchema = createChecklistSchema;

export const updateCategoryPermissionsSchema = z.object({
  category: z.string().trim().min(1).max(120),
  viewChecklist: z.boolean(),
  viewAllChecklistDemands: z.boolean(),
  interactAllChecklistDemands: z.boolean(),
  createChecklist: z.boolean(),
  editChecklist: z.boolean(),
  reports: z.boolean(),
  dashboard: z.boolean(),
  stages: z.boolean(),
});

export const dashboardScenarioSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(1000).nullish(),
  visualization: z.enum(["metric", "bar", "donut", "table"]),
  summarySql: z.string().trim().min(10).max(50_000),
  detailSql: z.string().trim().max(50_000).nullish(),
  labelField: z.string().trim().max(100).nullish(),
  valueField: z.string().trim().min(1).max(100).default("QUANTIDADE"),
  labelFormat: dashboardDisplayFormatSchema.default("text"),
  valueFormat: dashboardDisplayFormatSchema.default("auto"),
  columnFormats: z.array(z.object({
    field: z.string().trim().min(1).max(100),
    format: dashboardDisplayFormatSchema,
    scope: z.enum(["summary", "detail", "both"]),
  })).max(100).default([]),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
  position: z.coerce.number().int().min(0).max(10_000),
  active: z.boolean().default(true),
  version: z.coerce.number().int().min(0).default(0),
}).superRefine((scenario, context) => {
  const keys = scenario.columnFormats.map((rule) => `${rule.field.toLowerCase()}:${rule.scope}`);
  if (new Set(keys).size !== keys.length) {
    context.addIssue({ code: "custom", path: ["columnFormats"], message: "Existem regras duplicadas para a mesma coluna e aplicação." });
  }
});

export const dashboardScenarioPreviewSchema = z.object({
  sql: z.string().trim().min(10).max(50_000),
});

const staticOptionSchema = z.object({
  value: z.string().trim().min(1).max(200),
  label: z.string().trim().min(1).max(300),
});

export const optionSourceSchema = z.object({
  key: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{1,99}$/),
  label: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).nullish(),
  sourceType: z.enum(["static", "postgres", "firebird"]),
  querySql: z.string().trim().max(50_000).nullish(),
  resultValueField: z.string().trim().min(1).max(100).default("VALUE"),
  resultLabelField: z.string().trim().min(1).max(100).default("LABEL"),
  staticOptions: z.array(staticOptionSchema).max(1_000).default([]),
  active: z.boolean().default(true),
}).superRefine((source, context) => {
  if (source.sourceType === "static" && source.staticOptions.length === 0) {
    context.addIssue({ code: "custom", path: ["staticOptions"], message: "Inclua pelo menos uma opção estática." });
  }
  if (source.sourceType !== "static" && !source.querySql) {
    context.addIssue({ code: "custom", path: ["querySql"], message: "Informe a consulta da fonte." });
  }
  const values = source.staticOptions.map((option) => option.value);
  if (new Set(values).size !== values.length) {
    context.addIssue({ code: "custom", path: ["staticOptions"], message: "Os valores das opções devem ser únicos." });
  }
});

export const optionSourcePreviewSchema = z.object({
  sourceType: z.enum(["static", "postgres", "firebird"]),
  querySql: z.string().trim().max(50_000).nullish(),
  resultValueField: z.string().trim().min(1).max(100).default("VALUE"),
  resultLabelField: z.string().trim().min(1).max(100).default("LABEL"),
  staticOptions: z.array(staticOptionSchema).max(1_000).default([]),
}).superRefine((source, context) => {
  if (source.sourceType === "static" && source.staticOptions.length === 0) {
    context.addIssue({ code: "custom", path: ["staticOptions"], message: "Inclua pelo menos uma opção estática." });
  }
  if (source.sourceType !== "static" && !source.querySql) {
    context.addIssue({ code: "custom", path: ["querySql"], message: "Informe a consulta da fonte." });
  }
});

export const startChecklistExecutionSchema = z.object({
  checklistId: z.string().uuid(),
  branchId: z.string().trim().min(1).max(120),
  saleNumber: z.string().trim().min(1).max(120),
});

export const saveChecklistExecutionSchema = z.object({
  answers: z.record(z.string().uuid(), z.unknown()),
  complete: z.boolean().default(false),
});

export const advanceChecklistFlowSchema = z.object({
  nodeId: z.string().uuid(),
  answer: z.unknown().optional(),
  observation: z.string().trim().max(5000).nullish(),
  itemAnswers: z.array(z.object({ itemIndex: z.number().int().min(0).max(9999), success: z.boolean(), observation: z.string().trim().max(2000).nullish() })).max(1000).optional(),
});

export const simulateChecklistFlowSchema = z.object({
  flow: checklistFlowSchema,
  branchId: z.string().trim().min(1).max(120),
  saleNumber: z.string().trim().min(1).max(120),
  nodeKey: z.string().trim().max(100).nullish(),
  answer: z.unknown().optional(),
  observation: z.string().trim().max(5000).nullish(),
  saleItems: z.array(z.object({ code: z.string().max(200), description: z.string().max(2000), quantity: z.union([z.string().max(100), z.number()]) })).max(1000).optional(),
  itemAnswers: z.array(z.object({ itemIndex: z.number().int().min(0).max(9999), success: z.boolean(), observation: z.string().trim().max(2000).nullish() })).max(1000).optional(),
});
