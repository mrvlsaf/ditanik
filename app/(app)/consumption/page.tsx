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
      title="Consumption rates"
      info="The metres of fabric one garment needs. When you add a garment line to an LPO, quantity times this rate gives the fabric expected."
      description="The standard metres of fabric each garment needs. LPOs use these rates to work out how much fabric an order should require. Set these up once and change them rarely."
    >
      <Suspense fallback={<SectionLoading label="Loading rates…" />}>
        <ConsumptionRates />
      </Suspense>
    </PageContainer>
  );
}
