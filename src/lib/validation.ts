import { z } from "zod";

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
