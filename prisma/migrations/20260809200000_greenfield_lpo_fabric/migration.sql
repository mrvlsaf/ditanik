-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN');

-- CreateEnum
CREATE TYPE "LpoStatus" AS ENUM ('LPO_RECEIVED', 'UNDER_REVIEW', 'ASSIGNED_TO_MANUFACTURER', 'CLIENT_DELIVERY_COMPLETED');

-- CreateEnum
CREATE TYPE "LpoDateField" AS ENUM ('ASSIGNMENT', 'PRODUCTION_DEADLINE', 'CLIENT_DELIVERY');

-- CreateEnum
CREATE TYPE "FabricMovementType" AS ENUM ('RECEIVED', 'ISSUED', 'USED_FOR_LPO', 'RETURNED', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "FabricVarianceReason" AS ENUM ('CUTTING_WASTAGE', 'DAMAGE', 'SIZE_ALTERATION', 'PRODUCTION_MISTAKE', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "google_sub" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_normalized" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manufacturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lpos" (
    "id" TEXT NOT NULL,
    "lpo_number" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "lpo_date" DATE NOT NULL,
    "received_date" DATE NOT NULL,
    "original_file_key" TEXT NOT NULL,
    "original_file_name" TEXT NOT NULL,
    "original_mime_type" TEXT NOT NULL,
    "status" "LpoStatus" NOT NULL DEFAULT 'LPO_RECEIVED',
    "manufacturer_assignment_at" TIMESTAMP(3) NOT NULL,
    "production_deadline_at" TIMESTAMP(3) NOT NULL,
    "client_delivery_at" TIMESTAMP(3) NOT NULL,
    "manufacturer_id" TEXT,
    "production_file_key" TEXT,
    "production_file_name" TEXT,
    "production_mime_type" TEXT,
    "client_delivered_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lpos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lpo_date_changes" (
    "id" TEXT NOT NULL,
    "lpo_id" TEXT NOT NULL,
    "field" "LpoDateField" NOT NULL,
    "old_value" TIMESTAMP(3) NOT NULL,
    "new_value" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "changed_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lpo_date_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lpo_fabric_requirements" (
    "id" TEXT NOT NULL,
    "lpo_id" TEXT NOT NULL,
    "garment_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "meters_per_unit" DECIMAL(12,3) NOT NULL,
    "expected_meters" DECIMAL(12,3) NOT NULL,
    "consumption_rate_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lpo_fabric_requirements_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "fabric_supplier_invoices" (
    "id" TEXT NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "invoice_ref" TEXT NOT NULL,
    "received_date" DATE NOT NULL,
    "invoice_file_key" TEXT,
    "invoice_file_name" TEXT,
    "invoice_mime_type" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fabric_supplier_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fabric_batches" (
    "id" TEXT NOT NULL,
    "fabric_code" TEXT NOT NULL,
    "fabric_type" TEXT NOT NULL,
    "colour" TEXT NOT NULL,
    "remarks" TEXT,
    "qty_received" DECIMAL(12,3) NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fabric_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fabric_movements" (
    "id" TEXT NOT NULL,
    "type" "FabricMovementType" NOT NULL,
    "batch_id" TEXT NOT NULL,
    "manufacturer_id" TEXT,
    "lpo_id" TEXT,
    "quantity_meters" DECIMAL(12,3) NOT NULL,
    "transport_ref" TEXT,
    "note" TEXT,
    "created_by_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fabric_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garment_consumption_rates" (
    "id" TEXT NOT NULL,
    "garment_name" TEXT NOT NULL,
    "meters_per_unit" DECIMAL(12,3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "garment_consumption_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fabric_variances" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT,
    "manufacturer_id" TEXT,
    "lpo_id" TEXT,
    "expected_meters" DECIMAL(12,3) NOT NULL,
    "actual_meters" DECIMAL(12,3) NOT NULL,
    "difference_meters" DECIMAL(12,3) NOT NULL,
    "reason" "FabricVarianceReason" NOT NULL,
    "note" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fabric_variances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_sub_key" ON "users"("google_sub");

-- CreateIndex
CREATE UNIQUE INDEX "manufacturers_name_normalized_key" ON "manufacturers"("name_normalized");

-- CreateIndex
CREATE INDEX "manufacturers_is_active_idx" ON "manufacturers"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "lpos_lpo_number_key" ON "lpos"("lpo_number");

-- CreateIndex
CREATE INDEX "lpos_status_idx" ON "lpos"("status");

-- CreateIndex
CREATE INDEX "lpos_manufacturer_assignment_at_idx" ON "lpos"("manufacturer_assignment_at");

-- CreateIndex
CREATE INDEX "lpos_production_deadline_at_idx" ON "lpos"("production_deadline_at");

-- CreateIndex
CREATE INDEX "lpos_client_delivery_at_idx" ON "lpos"("client_delivery_at");

-- CreateIndex
CREATE INDEX "lpos_manufacturer_id_idx" ON "lpos"("manufacturer_id");

-- CreateIndex
CREATE INDEX "lpo_date_changes_lpo_id_created_at_idx" ON "lpo_date_changes"("lpo_id", "created_at");

-- CreateIndex
CREATE INDEX "lpo_fabric_requirements_lpo_id_idx" ON "lpo_fabric_requirements"("lpo_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "fabric_supplier_invoices_supplier_name_idx" ON "fabric_supplier_invoices"("supplier_name");

-- CreateIndex
CREATE INDEX "fabric_supplier_invoices_received_date_idx" ON "fabric_supplier_invoices"("received_date");

-- CreateIndex
CREATE UNIQUE INDEX "fabric_batches_fabric_code_key" ON "fabric_batches"("fabric_code");

-- CreateIndex
CREATE INDEX "fabric_batches_invoice_id_idx" ON "fabric_batches"("invoice_id");

-- CreateIndex
CREATE INDEX "fabric_batches_fabric_type_colour_idx" ON "fabric_batches"("fabric_type", "colour");

-- CreateIndex
CREATE INDEX "fabric_movements_batch_id_created_at_idx" ON "fabric_movements"("batch_id", "created_at");

-- CreateIndex
CREATE INDEX "fabric_movements_manufacturer_id_created_at_idx" ON "fabric_movements"("manufacturer_id", "created_at");

-- CreateIndex
CREATE INDEX "fabric_movements_lpo_id_idx" ON "fabric_movements"("lpo_id");

-- CreateIndex
CREATE INDEX "fabric_movements_type_idx" ON "fabric_movements"("type");

-- CreateIndex
CREATE UNIQUE INDEX "garment_consumption_rates_garment_name_key" ON "garment_consumption_rates"("garment_name");

-- CreateIndex
CREATE INDEX "fabric_variances_lpo_id_idx" ON "fabric_variances"("lpo_id");

-- CreateIndex
CREATE INDEX "fabric_variances_manufacturer_id_idx" ON "fabric_variances"("manufacturer_id");

-- AddForeignKey
ALTER TABLE "manufacturers" ADD CONSTRAINT "manufacturers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lpos" ADD CONSTRAINT "lpos_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lpos" ADD CONSTRAINT "lpos_manufacturer_id_fkey" FOREIGN KEY ("manufacturer_id") REFERENCES "manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lpo_date_changes" ADD CONSTRAINT "lpo_date_changes_lpo_id_fkey" FOREIGN KEY ("lpo_id") REFERENCES "lpos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lpo_date_changes" ADD CONSTRAINT "lpo_date_changes_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lpo_fabric_requirements" ADD CONSTRAINT "lpo_fabric_requirements_lpo_id_fkey" FOREIGN KEY ("lpo_id") REFERENCES "lpos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lpo_fabric_requirements" ADD CONSTRAINT "lpo_fabric_requirements_consumption_rate_id_fkey" FOREIGN KEY ("consumption_rate_id") REFERENCES "garment_consumption_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fabric_supplier_invoices" ADD CONSTRAINT "fabric_supplier_invoices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fabric_batches" ADD CONSTRAINT "fabric_batches_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "fabric_supplier_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fabric_movements" ADD CONSTRAINT "fabric_movements_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "fabric_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fabric_movements" ADD CONSTRAINT "fabric_movements_manufacturer_id_fkey" FOREIGN KEY ("manufacturer_id") REFERENCES "manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fabric_movements" ADD CONSTRAINT "fabric_movements_lpo_id_fkey" FOREIGN KEY ("lpo_id") REFERENCES "lpos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fabric_movements" ADD CONSTRAINT "fabric_movements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fabric_variances" ADD CONSTRAINT "fabric_variances_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "fabric_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fabric_variances" ADD CONSTRAINT "fabric_variances_manufacturer_id_fkey" FOREIGN KEY ("manufacturer_id") REFERENCES "manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fabric_variances" ADD CONSTRAINT "fabric_variances_lpo_id_fkey" FOREIGN KEY ("lpo_id") REFERENCES "lpos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fabric_variances" ADD CONSTRAINT "fabric_variances_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

