import { marketingMetadata, MarketingPage } from "@/components/marketing/pages";
import { PrivacyPolicy } from "@/components/marketing/legal";

export const metadata = marketingMetadata("privacy");

export default function Page() {
  return (
    <MarketingPage page="privacy">
      <PrivacyPolicy />
    </MarketingPage>
  );
}
