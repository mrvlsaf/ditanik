-- "Quote" was never a separate document: it is the Quotation. Remove the QUOTE
-- document type. Any documents already generated as QUOTE (and their daily
-- number counters) are deleted first, since no QUOTATION value can represent them.
DELETE FROM "generated_documents" WHERE "type" = 'QUOTE';
DELETE FROM "document_sequences" WHERE "type" = 'QUOTE';

-- AlterEnum
BEGIN;
CREATE TYPE "DocumentType_new" AS ENUM ('QUOTATION', 'TAX_INVOICE', 'DELIVERY_NOTE');
ALTER TABLE "document_sequences" ALTER COLUMN "type" TYPE "DocumentType_new" USING ("type"::text::"DocumentType_new");
ALTER TABLE "generated_documents" ALTER COLUMN "type" TYPE "DocumentType_new" USING ("type"::text::"DocumentType_new");
ALTER TYPE "DocumentType" RENAME TO "DocumentType_old";
ALTER TYPE "DocumentType_new" RENAME TO "DocumentType";
DROP TYPE "DocumentType_old";
COMMIT;
