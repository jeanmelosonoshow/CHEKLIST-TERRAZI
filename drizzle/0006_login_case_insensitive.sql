DROP INDEX IF EXISTS "usuarios_login_idx";

CREATE UNIQUE INDEX "usuarios_login_idx"
ON "usuarios" (lower("login"));
