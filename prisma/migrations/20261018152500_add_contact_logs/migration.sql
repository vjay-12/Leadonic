-- CreateTable
CREATE TABLE "contact_logs" (
    "id" SERIAL NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "contact_date" DATE NOT NULL,
    "status_id" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_logs_lead_id_contact_date_idx" ON "contact_logs"("lead_id", "contact_date");

-- AddForeignKey
ALTER TABLE "contact_logs" ADD CONSTRAINT "contact_logs_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_logs" ADD CONSTRAINT "contact_logs_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lead_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
