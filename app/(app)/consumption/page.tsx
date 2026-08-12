import { Suspense } from "react";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { SectionLoading } from "@/components/app-shell/SectionLoading";
import { ConsumptionRatesPanel } from "@/components/fabric/ConsumptionRatesPanel";
import { listActiveRates } from "@/modules/fabric/application/consumption";

async function ConsumptionRates() {
  const rates = await listActiveRates();
  return <ConsumptionRatesPanel rates={rates} />;
}

export default function ConsumptionPage() {
  return (
    <PageContainer
      title="Consumption"
      description="Standard fabric meters per garment. LPOs use these rates to calculate expected fabric requirement."
    >
      <Suspense fallback={<SectionLoading label="Loading rates…" />}>
        <ConsumptionRates />
      </Suspense>
    </PageContainer>
  );
}
