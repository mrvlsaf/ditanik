-- Replace leftover outbound-docs schema (applied earlier, code since reverted)
-- with the document-generation models in the current Prisma schema.

DROP TABLE IF EXISTS "lpo_outbound_documents";
DROP TABLE IF EXISTS "document_sequences";
DROP TYPE IF EXISTS "LpoOutboundDocType";

ALTER TABLE "lpos" DROP COLUMN IF EXISTS "client_code";

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('QUOTATION', 'QUOTE', 'TAX_INVOICE', 'DELIVERY_NOTE');

-- AlterTable
ALTER TABLE "lpos"
ADD COLUMN "client_sub_entity_name" TEXT,
ADD COLUMN "client_trn" TEXT,
ADD COLUMN "invoice_address" TEXT,
ADD COLUMN "delivery_address" TEXT,
ADD COLUMN "site_code" TEXT,
ADD COLUMN "payment_terms" TEXT,
ADD COLUMN "delivery_terms" TEXT,
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'AED';

-- CreateTable
CREATE TABLE "lpo_line_items" (
    "id" TEXT NOT NULL,
    "lpo_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "category" TEXT,
    "description" TEXT NOT NULL,
    "article_no" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lpo_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_profile" (
    "id" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "trn" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "bank_name" TEXT,
    "bank_account_name" TEXT,
    "bank_account_number" TEXT,
    "bank_iban" TEXT,
    "bank_swift_code" TEXT,
    "default_terms_text" TEXT,
    "default_footer_text" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_sequences" (
    "id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "calendar_day" DATE NOT NULL,
    "last_sequence" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_documents" (
    "id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "document_number" TEXT NOT NULL,
    "lpo_id" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "generated_by_id" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lpo_line_items_lpo_id_idx" ON "lpo_line_items"("lpo_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_sequences_type_calendar_day_key" ON "document_sequences"("type", "calendar_day");

-- CreateIndex
CREATE UNIQUE INDEX "generated_documents_document_number_key" ON "generated_documents"("document_number");

-- CreateIndex
CREATE INDEX "generated_documents_lpo_id_idx" ON "generated_documents"("lpo_id");

-- CreateIndex
CREATE INDEX "generated_documents_type_generated_at_idx" ON "generated_documents"("type", "generated_at");

-- AddForeignKey
ALTER TABLE "lpo_line_items" ADD CONSTRAINT "lpo_line_items_lpo_id_fkey" FOREIGN KEY ("lpo_id") REFERENCES "lpos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_lpo_id_fkey" FOREIGN KEY ("lpo_id") REFERENCES "lpos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_generated_by_id_fkey" FOREIGN KEY ("generated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
