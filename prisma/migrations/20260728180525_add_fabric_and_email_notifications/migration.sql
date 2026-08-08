-- CreateEnum
CREATE TYPE "OverdueEmailType" AS ENUM ('REVIEW_OVERDUE', 'DELIVERY_OVERDUE');

-- CreateTable
CREATE TABLE "email_notifications" (
    "id" TEXT NOT NULL,
    "lpo_id" TEXT NOT NULL,
    "type" "OverdueEmailType" NOT NULL,
    "due_at" TIMESTAMP(3) NOT NULL,
    "recipient" TEXT NOT NULL,
    "dry_run" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fabric_entries" (
    "id" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "vendor_normalized" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "meters_received" DECIMAL(12,2) NOT NULL,
    "meters_delivered" DECIMAL(12,2) NOT NULL,
    "destination" TEXT NOT NULL,
    "invoice_file_key" TEXT NOT NULL,
    "invoice_file_name" TEXT NOT NULL,
    "invoice_mime_type" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fabric_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_notifications_created_at_idx" ON "email_notifications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_notifications_lpo_id_type_due_at_key" ON "email_notifications"("lpo_id", "type", "due_at");

-- CreateIndex
CREATE INDEX "fabric_entries_vendor_normalized_idx" ON "fabric_entries"("vendor_normalized");

-- CreateIndex
CREATE INDEX "fabric_entries_created_at_idx" ON "fabric_entries"("created_at");

-- AddForeignKey
ALTER TABLE "email_notifications" ADD CONSTRAINT "email_notifications_lpo_id_fkey" FOREIGN KEY ("lpo_id") REFERENCES "lpos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fabric_entries" ADD CONSTRAINT "fabric_entries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
