-- Urgent LPOs: created with no planned dates and, optionally, no customer PDF.
ALTER TABLE "lpos" ALTER COLUMN "original_file_key" DROP NOT NULL;
ALTER TABLE "lpos" ALTER COLUMN "original_file_name" DROP NOT NULL;
ALTER TABLE "lpos" ALTER COLUMN "original_mime_type" DROP NOT NULL;
ALTER TABLE "lpos" ALTER COLUMN "manufacturer_assignment_at" DROP NOT NULL;
ALTER TABLE "lpos" ALTER COLUMN "production_deadline_at" DROP NOT NULL;
ALTER TABLE "lpos" ALTER COLUMN "client_delivery_at" DROP NOT NULL;

ALTER TABLE "lpos" ADD COLUMN "is_urgent" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "lpos_is_urgent_idx" ON "lpos"("is_urgent");

-- Counter for URGENT_<n> numbers (a single row, id = 1).
CREATE TABLE "urgent_lpo_counter" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "urgent_lpo_counter_pkey" PRIMARY KEY ("id")
);
INSERT INTO "urgent_lpo_counter" ("id", "last_value") VALUES (1, 0);
