-- AlterTable
ALTER TABLE "fabric_batches" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "fabric_supplier_invoices" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "fabric_batches_is_active_idx" ON "fabric_batches"("is_active");

-- CreateIndex
CREATE INDEX "fabric_supplier_invoices_is_active_idx" ON "fabric_supplier_invoices"("is_active");
