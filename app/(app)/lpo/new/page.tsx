import Link from "next/link";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { CreateLpoForm } from "@/components/lpo/CreateLpoForm";
import { isUsingBlobStorage } from "@/modules/files/infrastructure/get-file-storage";
import { getNextUrgentLpoNumber } from "@/modules/lpo/application/get-lpo";

export default async function NewLpoPage() {
  const nextUrgentNumber = await getNextUrgentLpoNumber();
  return (
    <PageContainer
      title="New LPO"
      description="Record a customer order. Fill in what is on the customer's LPO and upload its PDF. It starts as Under review. Rush order? Switch on Urgent."
      actions={
        <Link href="/lpo" className="btn-secondary">
          Cancel
        </Link>
      }
    >
      <CreateLpoForm
        usesBlobStorage={isUsingBlobStorage()}
        nextUrgentNumber={nextUrgentNumber}
      />
    </PageContainer>
  );
}
