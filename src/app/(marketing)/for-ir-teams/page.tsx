import { marketingMetadata, MarketingPage } from "@/components/marketing/pages";
import Teams from "@/components/marketing/Teams";

export const metadata = marketingMetadata("for-ir-teams");

export default function Page() {
  return (
    <MarketingPage page="for-ir-teams">
      <Teams />
    </MarketingPage>
  );
}
