import type { MetadataRoute } from "next";
import { articles, getSiteUrl } from "@/components/marketing/content";
import { getSiteRole } from "@/lib/site-role";

export default function sitemap(): MetadataRoute.Sitemap {
  // Only the marketing domain publishes these pages, so only it advertises them.
  if (getSiteRole() === "app") return [];

  const base = getSiteUrl();
  const lastModified = new Date("2026-09-17");
  const paths = [
    ["", 1],
    ["/platform", 0.8],
    ["/for-ir-teams", 0.8],
    ["/pricing", 0.8],
    ["/resources", 0.6],
    ["/about", 0.5],
    ["/book-a-demo", 0.7],
    ["/privacy", 0.3],
    ["/terms", 0.3],
  ] as const;

  return [
    ...paths.map(([path, priority]) => ({
      url: `${base}${path || "/"}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority,
    })),
    ...articles.map((article) => ({
      url: `${base}/resources/${article.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
