import { marketingMetadata, MarketingPage } from "@/components/marketing/pages";
import Pricing from "@/components/marketing/Pricing";

export const metadata = marketingMetadata("pricing");

export default function Page() {
  return (
    <MarketingPage page="pricing">
      <Pricing />
    </MarketingPage>
  );
}
