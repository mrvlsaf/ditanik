-- CreateEnum
CREATE TYPE "LpoStatus" AS ENUM ('PENDING', 'REVIEWED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "LpoDueDateField" AS ENUM ('REVIEW', 'DELIVERY');

-- CreateTable
CREATE TABLE "lpos" (
    "id" TEXT NOT NULL,
    "lpo_number" TEXT NOT NULL,
    "received_date" DATE NOT NULL,
    "original_file_key" TEXT NOT NULL,
    "original_file_name" TEXT NOT NULL,
    "original_mime_type" TEXT NOT NULL,
    "review_due_at" TIMESTAMP(3) NOT NULL,
    "delivery_due_at" TIMESTAMP(3) NOT NULL,
    "status" "LpoStatus" NOT NULL DEFAULT 'PENDING',
    "review_file_key" TEXT,
    "review_file_name" TEXT,
    "review_mime_type" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lpos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lpo_comments" (
    "id" TEXT NOT NULL,
    "lpo_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lpo_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lpo_due_date_changes" (
    "id" TEXT NOT NULL,
    "lpo_id" TEXT NOT NULL,
    "field" "LpoDueDateField" NOT NULL,
    "old_value" TIMESTAMP(3) NOT NULL,
    "new_value" TIMESTAMP(3) NOT NULL,
    "justification" TEXT NOT NULL,
    "changed_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lpo_due_date_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_id" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lpos_lpo_number_key" ON "lpos"("lpo_number");

-- CreateIndex
CREATE INDEX "lpos_status_idx" ON "lpos"("status");

-- CreateIndex
CREATE INDEX "lpos_review_due_at_idx" ON "lpos"("review_due_at");

-- CreateIndex
CREATE INDEX "lpos_delivery_due_at_idx" ON "lpos"("delivery_due_at");

-- CreateIndex
CREATE INDEX "lpo_comments_lpo_id_created_at_idx" ON "lpo_comments"("lpo_id", "created_at");

-- CreateIndex
CREATE INDEX "lpo_due_date_changes_lpo_id_created_at_idx" ON "lpo_due_date_changes"("lpo_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "lpos" ADD CONSTRAINT "lpos_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lpo_comments" ADD CONSTRAINT "lpo_comments_lpo_id_fkey" FOREIGN KEY ("lpo_id") REFERENCES "lpos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lpo_comments" ADD CONSTRAINT "lpo_comments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lpo_due_date_changes" ADD CONSTRAINT "lpo_due_date_changes_lpo_id_fkey" FOREIGN KEY ("lpo_id") REFERENCES "lpos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lpo_due_date_changes" ADD CONSTRAINT "lpo_due_date_changes_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
