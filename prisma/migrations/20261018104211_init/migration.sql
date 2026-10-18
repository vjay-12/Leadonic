-- CreateTable
CREATE TABLE "lead_statuses" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748B',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" SERIAL NOT NULL,
    "file_name" TEXT NOT NULL,
    "category_id" INTEGER,
    "added_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "phone" TEXT,
    "phone_normalized" TEXT,
    "dedupe_key" TEXT NOT NULL,
    "emails" TEXT,
    "website" TEXT,
    "maps_category" TEXT,
    "address" TEXT,
    "review_rating" DECIMAL(3,1),
    "review_count" INTEGER,
    "has_website" BOOLEAN,
    "needs_website" BOOLEAN,
    "erp_match" TEXT,
    "needs_erp" BOOLEAN,
    "priority_score" DECIMAL(8,2),
    "priority" TEXT,
    "remarks" TEXT,
    "status_id" INTEGER,
    "category_id" INTEGER,
    "batch_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_statuses_name_key" ON "lead_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "lead_categories_name_key" ON "lead_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "leads_dedupe_key_key" ON "leads"("dedupe_key");

-- CreateIndex
CREATE INDEX "leads_status_id_idx" ON "leads"("status_id");

-- CreateIndex
CREATE INDEX "leads_category_id_idx" ON "leads"("category_id");

-- CreateIndex
CREATE INDEX "leads_priority_idx" ON "leads"("priority");

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "lead_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lead_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "lead_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
