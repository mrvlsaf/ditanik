-- Drop old email notification table/enum if present
DROP TABLE IF EXISTS "email_notifications";
DROP TYPE IF EXISTS "DeadlineEmailType";

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REVIEW_PENDING', 'ASSIGNMENT_OVERDUE', 'PRODUCTION_OVERDUE', 'CLIENT_DELIVERY_OVERDUE');

-- CreateEnum
CREATE TYPE "NotificationEmailStatus" AS ENUM ('PENDING', 'SENT', 'DRY_RUN', 'FAILED');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "lpo_id" TEXT NOT NULL,
    "due_at" TIMESTAMP(3),
    "business_day" DATE,
    "dedupe_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "action_path" TEXT NOT NULL,
    "email_status" "NotificationEmailStatus" NOT NULL DEFAULT 'PENDING',
    "email_sent_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "recipient" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");

-- CreateIndex
CREATE INDEX "notifications_read_at_created_at_idx" ON "notifications"("read_at", "created_at");

-- CreateIndex
CREATE INDEX "notifications_type_created_at_idx" ON "notifications"("type", "created_at");

-- CreateIndex
CREATE INDEX "notifications_lpo_id_created_at_idx" ON "notifications"("lpo_id", "created_at");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_lpo_id_fkey" FOREIGN KEY ("lpo_id") REFERENCES "lpos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
