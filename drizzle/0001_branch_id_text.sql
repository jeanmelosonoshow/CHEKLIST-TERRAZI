ALTER TABLE "users"
ALTER COLUMN "branch_id" SET DATA TYPE text
USING "branch_id"::text;
