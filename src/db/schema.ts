import {
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

export const fieldTypeEnum = pgEnum("checklist_field_type", [
  "short_text",
  "long_text",
  "number",
  "date",
  "boolean",
  "single_select",
  "multi_select",
]);
export const checklistStatusEnum = pgEnum("checklist_status", ["draft", "published", "archived"]);
export const syncStatusEnum = pgEnum("sync_status", ["running", "success", "failed"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    branchId: integer("branch_id").notNull(),
    category: text("category"),
    employeeId: integer("employee_id").notNull(),
    employeeName: text("employee_name").notNull(),
    login: text("login").notNull(),
    passwordHash: text("password_hash").notNull(),
    active: boolean("active").default(true).notNull(),
    isAdmin: boolean("is_admin").default(false).notNull(),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_employee_id_idx").on(table.employeeId),
    uniqueIndex("users_login_lower_idx").on(table.login),
    index("users_active_idx").on(table.active),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tokenHash: text("token_hash").notNull(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("sessions_token_hash_idx").on(table.tokenHash), index("sessions_user_id_idx").on(table.userId)],
);

export const syncRuns = pgTable("sync_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  source: text("source").notNull(),
  status: syncStatusEnum("status").default("running").notNull(),
  receivedCount: integer("received_count").default(0).notNull(),
  processedCount: integer("processed_count").default(0).notNull(),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const syncedSources = pgTable("synced_sources", {
  key: text("key").primaryKey(),
  label: text("label").notNull(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  schema: jsonb("schema").$type<Record<string, unknown>>().default({}).notNull(),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const syncedRecords = pgTable(
  "synced_records",
  {
    sourceKey: text("source_key").notNull().references(() => syncedSources.key, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    label: text("label").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().default({}).notNull(),
    active: boolean("active").default(true).notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.sourceKey, table.externalId] }),
    index("synced_records_source_active_idx").on(table.sourceKey, table.active),
  ],
);

export const checklists = pgTable("checklists", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: checklistStatusEnum("status").default("draft").notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const checklistFields = pgTable(
  "checklist_fields",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    checklistId: uuid("checklist_id").notNull().references(() => checklists.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    description: text("description"),
    type: fieldTypeEnum("type").notNull(),
    required: boolean("required").default(false).notNull(),
    position: integer("position").notNull(),
    sourceKey: text("source_key").references(() => syncedSources.key),
    configuration: jsonb("configuration").$type<Record<string, unknown>>().default({}).notNull(),
  },
  (table) => [index("checklist_fields_order_idx").on(table.checklistId, table.position)],
);

export const checklistFieldOptions = pgTable(
  "checklist_field_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fieldId: uuid("field_id").notNull().references(() => checklistFields.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    label: text("label").notNull(),
    position: integer("position").notNull(),
    active: boolean("active").default(true).notNull(),
  },
  (table) => [index("checklist_options_order_idx").on(table.fieldId, table.position)],
);

export const checklistResponses = pgTable("checklist_responses", {
  id: uuid("id").defaultRandom().primaryKey(),
  checklistId: uuid("checklist_id").notNull().references(() => checklists.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  answers: jsonb("answers").$type<Record<string, unknown>>().default({}).notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
