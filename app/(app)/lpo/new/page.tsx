import Link from "next/link";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { CreateLpoForm } from "@/components/lpo/CreateLpoForm";
import { isUsingBlobStorage } from "@/modules/files/infrastructure/get-file-storage";

export default function NewLpoPage() {
  return (
    <PageContainer
      title="New LPO"
      description="Record a customer order. Fill in what is on the customer's LPO and upload its PDF. It starts as Under review."
      actions={
        <Link href="/lpo" className="btn-secondary">
          Cancel
        </Link>
      }
    >
      <CreateLpoForm usesBlobStorage={isUsingBlobStorage()} />
    </PageContainer>
  );
}
