-- CreateEnum
CREATE TYPE "DeadlineEmailType" AS ENUM ('PRODUCTION_OVERDUE', 'CLIENT_DELIVERY_OVERDUE');

-- CreateTable
CREATE TABLE "email_notifications" (
    "id" TEXT NOT NULL,
    "lpo_id" TEXT NOT NULL,
    "type" "DeadlineEmailType" NOT NULL,
    "due_at" TIMESTAMP(3) NOT NULL,
    "recipient" TEXT NOT NULL,
    "dry_run" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_notifications_created_at_idx" ON "email_notifications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_notifications_lpo_id_type_due_at_key" ON "email_notifications"("lpo_id", "type", "due_at");

-- AddForeignKey
ALTER TABLE "email_notifications" ADD CONSTRAINT "email_notifications_lpo_id_fkey" FOREIGN KEY ("lpo_id") REFERENCES "lpos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
