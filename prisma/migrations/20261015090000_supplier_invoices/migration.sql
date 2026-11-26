-- Invoices hub: accessory and manufacturing invoices received from suppliers, plus an
-- optional total (incl. VAT) on fabric invoices so every invoice can feed the VAT summary.

-- CreateEnum
CREATE TYPE "SupplierInvoiceKind" AS ENUM ('ACCESSORY', 'MANUFACTURING');

-- AlterTable
ALTER TABLE "fabric_supplier_invoices" ADD COLUMN "total_incl_vat" DECIMAL(14,2);

-- CreateTable
CREATE TABLE "supplier_invoices" (
    "id" TEXT NOT NULL,
    "kind" "SupplierInvoiceKind" NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "invoice_ref" TEXT,
    "received_date" DATE NOT NULL,
    "file_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "vat_amount" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_invoice_lines" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_price" DECIMAL(14,4) NOT NULL,
    "vat_percent" DECIMAL(5,2) NOT NULL,
    "line_total" DECIMAL(14,2) NOT NULL,
    "vat_amount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "supplier_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_invoices_kind_idx" ON "supplier_invoices"("kind");

-- CreateIndex
CREATE INDEX "supplier_invoices_received_date_idx" ON "supplier_invoices"("received_date");

-- CreateIndex
CREATE INDEX "supplier_invoice_lines_invoice_id_idx" ON "supplier_invoice_lines"("invoice_id");

-- AddForeignKey
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoice_lines" ADD CONSTRAINT "supplier_invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "supplier_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
