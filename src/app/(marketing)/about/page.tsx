import { marketingMetadata, MarketingPage } from "@/components/marketing/pages";
import About from "@/components/marketing/About";

export const metadata = marketingMetadata("about");

export default function Page() {
  return (
    <MarketingPage page="about">
      <About />
    </MarketingPage>
  );
}
