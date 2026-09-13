-- DropForeignKey
ALTER TABLE "generated_documents" DROP CONSTRAINT "generated_documents_lpo_id_fkey";

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_lpo_id_fkey" FOREIGN KEY ("lpo_id") REFERENCES "lpos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
