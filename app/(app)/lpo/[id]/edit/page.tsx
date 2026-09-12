import { notFound } from "next/navigation";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { EditLpoForm } from "@/components/lpo/EditLpoForm";
import { getLpoById } from "@/modules/lpo/application/get-lpo";

export default async function EditLpoPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const lpo = await getLpoById(id);

  if (!lpo) {
    notFound();
  }

  return (
    <PageContainer
      title={`Edit LPO ${lpo.lpoNumber}`}
      description={lpo.nickname}
    >
      <EditLpoForm
        defaults={{
          lpoId: lpo.id,
          lpoNumber: lpo.lpoNumber,
          nickname: lpo.nickname,
          clientName: lpo.clientName,
          clientSubEntityName: lpo.clientSubEntityName ?? "",
          clientTrn: lpo.clientTrn ?? "",
          invoiceAddress: lpo.invoiceAddress ?? "",
          deliveryAddress: lpo.deliveryAddress ?? "",
          siteCode: lpo.siteCode ?? "",
          paymentTerms: lpo.paymentTerms ?? "",
          deliveryTerms: lpo.deliveryTerms ?? "",
          currency: lpo.currency,
          lineItems: lpo.lineItems.map((line) => ({
            category: line.category ?? "",
            description: line.description,
            articleNo: line.articleNo ?? "",
            quantity: String(line.quantity),
            unitPrice: String(line.unitPrice),
            discountPercent:
              Number(line.discountPercent) > 0 ? String(line.discountPercent) : "",
          })),
        }}
      />
    </PageContainer>
  );
}
