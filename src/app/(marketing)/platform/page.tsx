import { marketingMetadata, MarketingPage } from "@/components/marketing/pages";
import Platform from "@/components/marketing/Platform";

export const metadata = marketingMetadata("platform");

export default function Page() {
  return (
    <MarketingPage page="platform">
      <Platform />
    </MarketingPage>
  );
}
