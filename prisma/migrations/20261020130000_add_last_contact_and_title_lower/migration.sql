-- AlterTable
ALTER TABLE "leads" ADD COLUMN "last_contact_date" DATE;
ALTER TABLE "leads" ADD COLUMN "title_lower" TEXT GENERATED ALWAYS AS (lower("title")) STORED;

-- CreateIndex
CREATE INDEX "leads_last_contact_date_idx" ON "leads"("last_contact_date");
CREATE INDEX "leads_title_lower_idx" ON "leads"("title_lower");

-- Backfill last_contact_date from latest contact log date for each lead
UPDATE "leads" l
SET "last_contact_date" = sub.max_date
FROM (
  SELECT "lead_id", MAX("contact_date") AS max_date
  FROM "contact_logs"
  GROUP BY "lead_id"
) sub
WHERE l.id = sub.lead_id;
