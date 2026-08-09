import { PageContainer } from "@/components/app-shell/PageContainer";
import { ConsumptionRatesPanel } from "@/components/fabric/ConsumptionRatesPanel";
import { listActiveRates } from "@/modules/fabric/application/consumption";

export default async function ConsumptionPage() {
  const rates = await listActiveRates();

  return (
    <PageContainer
      title="Consumption"
      description="Standard fabric meters per garment. LPOs use these rates to calculate expected fabric requirement."
    >
      <ConsumptionRatesPanel rates={rates} />
    </PageContainer>
  );
}
