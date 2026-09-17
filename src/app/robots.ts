import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/components/marketing/content";
import { getSiteRole } from "@/lib/site-role";

export default function robots(): MetadataRoute.Robots {
  // The application domain builds the marketing pages too, even though it redirects
  // away from them. Keeping it out of the index entirely avoids competing with the
  // marketing domain for the same content.
  if (getSiteRole() === "app") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api/", "/admin"],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
