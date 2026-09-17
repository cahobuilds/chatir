import { MarketingShell } from "@/components/marketing/Site";
import NotFoundContent from "@/components/marketing/NotFound";

export const metadata = { title: "Page not found" };

// Unmatched URLs anywhere in the app land here, outside every route group, so
// this renders the marketing chrome itself rather than inheriting a layout.
export default function NotFound() {
  return (
    <MarketingShell>
      <NotFoundContent />
    </MarketingShell>
  );
}
