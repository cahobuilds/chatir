import { marketingMetadata, MarketingPage } from "@/components/marketing/pages";
import { DemoBooking } from "@/components/marketing/interactive";
import { getDemoContact } from "@/components/marketing/content";

export const metadata = marketingMetadata("book-a-demo");

export default function Page() {
  return (
    <MarketingPage page="book-a-demo">
      <DemoBooking {...getDemoContact()} />
    </MarketingPage>
  );
}
