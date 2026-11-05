CREATE TYPE "formato_exibicao_dashboard" AS ENUM (
  'auto',
  'text',
  'integer',
  'decimal',
  'currency_brl',
  'percent',
  'date_short',
  'date_long',
  'datetime',
  'month_year',
  'month_name',
  'weekday'
);

ALTER TABLE "cenarios_dashboard"
ADD COLUMN "formato_rotulo" "formato_exibicao_dashboard" DEFAULT 'text' NOT NULL,
ADD COLUMN "formato_valor" "formato_exibicao_dashboard" DEFAULT 'auto' NOT NULL;
