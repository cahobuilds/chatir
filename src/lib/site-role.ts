/**
 * The marketing site and the application are built from this one repository, and each
 * Vercel project decides which half of it to serve. Keying that off an environment
 * variable rather than the request hostname means preview deployments, whose hostnames
 * are generated per build, behave the same way as production.
 *
 * "both" serves everything with no cross-domain redirects, which is what local
 * development wants.
 */
export type SiteRole = "app" | "marketing" | "both";

export function getSiteRole(): SiteRole {
  const configured = process.env.NEXT_PUBLIC_SITE_ROLE?.trim();
  if (configured === "app" || configured === "marketing" || configured === "both") {
    return configured;
  }
  // A deployment that sets nothing keeps serving the product exactly as it did before
  // the marketing site existed. Locally, both halves stay reachable on one origin.
  return process.env.VERCEL ? "app" : "both";
}

function readOrigin(raw: string | undefined) {
  const value = raw?.trim();
  if (!value) return undefined;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (url.protocol === "http:" || url.protocol === "https:") return url.origin;
  } catch {
    // Treated as unset by the callers below.
  }
  return undefined;
}

/** Origin serving the signed-in product. */
export function getAppOrigin() {
  return readOrigin(process.env.NEXT_PUBLIC_APP_URL);
}

/** Origin serving the public marketing pages. */
export function getMarketingOrigin() {
  return readOrigin(process.env.NEXT_PUBLIC_SITE_URL);
}

const MARKETING_PREFIXES = [
  "/about",
  "/book-a-demo",
  "/for-ir-teams",
  "/platform",
  "/pricing",
  "/privacy",
  "/resources",
  "/terms",
];

const APP_PREFIXES = [
  "/admin",
  "/agents",
  "/analytics",
  "/api",
  "/auth",
  "/billing",
  "/calls",
  "/chats",
  "/dashboard",
  "/knowledge",
  "/profile",
  "/settings",
  "/tenant-settings",
  "/users",
];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** "/" is excluded here because each role resolves it differently. */
export function isMarketingPath(pathname: string) {
  return matchesPrefix(pathname, MARKETING_PREFIXES);
}

export function isAppPath(pathname: string) {
  return matchesPrefix(pathname, APP_PREFIXES);
}
