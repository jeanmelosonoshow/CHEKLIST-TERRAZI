CREATE TYPE "checklist_field_type" AS ENUM ('short_text', 'long_text', 'number', 'date', 'boolean', 'single_select', 'multi_select');
CREATE TYPE "checklist_status" AS ENUM ('draft', 'published', 'archived');
CREATE TYPE "sync_status" AS ENUM ('running', 'success', 'failed');

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "branch_id" integer NOT NULL,
  "category" text,
  "employee_id" integer NOT NULL,
  "employee_name" text NOT NULL,
  "login" text NOT NULL,
  "password_hash" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "is_admin" boolean DEFAULT false NOT NULL,
  "source_updated_at" timestamptz,
  "last_synced_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "users_employee_id_idx" ON "users" ("employee_id");
CREATE UNIQUE INDEX "users_login_lower_idx" ON "users" (lower("login"));
CREATE INDEX "users_active_idx" ON "users" ("active");

CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "token_hash" text NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "last_seen_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "sessions_token_hash_idx" ON "sessions" ("token_hash");
CREATE INDEX "sessions_user_id_idx" ON "sessions" ("user_id");

CREATE TABLE "sync_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source" text NOT NULL,
  "status" "sync_status" DEFAULT 'running' NOT NULL,
  "received_count" integer DEFAULT 0 NOT NULL,
  "processed_count" integer DEFAULT 0 NOT NULL,
  "error_message" text,
  "started_at" timestamptz DEFAULT now() NOT NULL,
  "completed_at" timestamptz
);

CREATE TABLE "synced_sources" (
  "key" text PRIMARY KEY NOT NULL,
  "label" text NOT NULL,
  "description" text,
  "active" boolean DEFAULT true NOT NULL,
  "schema" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "last_synced_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "synced_records" (
  "source_key" text NOT NULL REFERENCES "synced_sources"("key") ON DELETE CASCADE,
  "external_id" text NOT NULL,
  "label" text NOT NULL,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "last_synced_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "synced_records_source_key_external_id_pk" PRIMARY KEY("source_key", "external_id")
);
CREATE INDEX "synced_records_source_active_idx" ON "synced_records" ("source_key", "active");

CREATE TABLE "checklists" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "status" "checklist_status" DEFAULT 'draft' NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "checklist_fields" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "checklist_id" uuid NOT NULL REFERENCES "checklists"("id") ON DELETE CASCADE,
  "label" text NOT NULL,
  "description" text,
  "type" "checklist_field_type" NOT NULL,
  "required" boolean DEFAULT false NOT NULL,
  "position" integer NOT NULL,
  "source_key" text REFERENCES "synced_sources"("key"),
  "configuration" jsonb DEFAULT '{}'::jsonb NOT NULL
);
CREATE INDEX "checklist_fields_order_idx" ON "checklist_fields" ("checklist_id", "position");

CREATE TABLE "checklist_field_options" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "field_id" uuid NOT NULL REFERENCES "checklist_fields"("id") ON DELETE CASCADE,
  "value" text NOT NULL,
  "label" text NOT NULL,
  "position" integer NOT NULL,
  "active" boolean DEFAULT true NOT NULL
);
CREATE INDEX "checklist_options_order_idx" ON "checklist_field_options" ("field_id", "position");

CREATE TABLE "checklist_responses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "checklist_id" uuid NOT NULL REFERENCES "checklists"("id"),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "submitted_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
