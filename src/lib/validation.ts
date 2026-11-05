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

export const createChecklistSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(1000).optional(),
  fields: z.array(fieldSchema).min(1).max(100),
});

export const updateChecklistSchema = createChecklistSchema;

export const updateCategoryPermissionsSchema = z.object({
  category: z.string().trim().min(1).max(120),
  viewChecklist: z.boolean(),
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
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
  position: z.coerce.number().int().min(0).max(10_000),
  active: z.boolean().default(true),
  version: z.coerce.number().int().min(0).default(0),
});

export const dashboardScenarioPreviewSchema = z.object({
  sql: z.string().trim().min(10).max(50_000),
});
