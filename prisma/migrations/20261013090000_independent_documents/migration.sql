-- Independent documents: a Quotation / Tax Invoice / Delivery Note can now be
-- generated without an LPO, so generated_documents.lpo_id becomes optional.
-- The FK (ON DELETE RESTRICT) is unchanged for documents that do have an LPO.
ALTER TABLE "generated_documents" ALTER COLUMN "lpo_id" DROP NOT NULL;

-- Client name is stored on the row so the Documents list can show and search it
-- for both LPO-linked and independent documents without parsing JSON.
ALTER TABLE "generated_documents" ADD COLUMN "client_name" TEXT;

-- Backfill from the frozen snapshots of existing (LPO-linked) documents.
UPDATE "generated_documents"
SET "client_name" = "snapshot"->'lpo'->>'clientName'
WHERE "client_name" IS NULL;
