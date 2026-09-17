import { marketingMetadata, MarketingPage } from "@/components/marketing/pages";
import { TermsOfService } from "@/components/marketing/legal";

export const metadata = marketingMetadata("terms");

export default function Page() {
  return (
    <MarketingPage page="terms">
      <TermsOfService />
    </MarketingPage>
  );
}
