-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "archived_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "leads_archived_at_idx" ON "leads"("archived_at");
