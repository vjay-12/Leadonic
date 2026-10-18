-- CreateTable
CREATE TABLE "school_stages" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748B',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schools" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "area" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "student_strength" INTEGER,
    "notes" TEXT,
    "stage_id" INTEGER,
    "lead_id" INTEGER,
    "dedupe_key" TEXT NOT NULL,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_contacts" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_meetings" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "meeting_date" DATE NOT NULL,
    "meeting_time" TEXT,
    "type" TEXT NOT NULL,
    "location_name" TEXT,
    "contact_id" INTEGER,
    "stage_id" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "school_stages_name_key" ON "school_stages"("name");

-- CreateIndex
CREATE UNIQUE INDEX "schools_dedupe_key_key" ON "schools"("dedupe_key");

-- CreateIndex
CREATE UNIQUE INDEX "schools_lead_id_key" ON "schools"("lead_id");

-- CreateIndex
CREATE INDEX "schools_stage_id_idx" ON "schools"("stage_id");

-- CreateIndex
CREATE INDEX "schools_area_idx" ON "schools"("area");

-- CreateIndex
CREATE INDEX "schools_archived_at_idx" ON "schools"("archived_at");

-- CreateIndex
CREATE INDEX "school_contacts_school_id_idx" ON "school_contacts"("school_id");

-- CreateIndex
CREATE INDEX "school_meetings_school_id_meeting_date_idx" ON "school_meetings"("school_id", "meeting_date");

-- CreateIndex
CREATE INDEX "school_meetings_stage_id_idx" ON "school_meetings"("stage_id");

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "school_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_contacts" ADD CONSTRAINT "school_contacts_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_meetings" ADD CONSTRAINT "school_meetings_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_meetings" ADD CONSTRAINT "school_meetings_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "school_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_meetings" ADD CONSTRAINT "school_meetings_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "school_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
