import { marketingMetadata, MarketingPage } from "@/components/marketing/pages";
import Resources from "@/components/marketing/Resources";

export const metadata = marketingMetadata("resources");

export default function Page() {
  return (
    <MarketingPage page="resources">
      <Resources />
    </MarketingPage>
  );
}
