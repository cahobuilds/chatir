"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getBreadcrumbPath, getNavItemByPath, NavCategory } from "@/config/navigation";
import Badge from "../ui/badge/Badge";

interface EnhancedBreadcrumbProps {
  className?: string;
}

const categoryLabels: Record<NavCategory, string> = {
  dashboard: "Dashboard",
  admin: "Admin",
  analytics: "Analytics",
  settings: "Settings",
  templates: "Templates",
};

const categoryColors: Record<NavCategory, "primary" | "success" | "info" | "warning"> = {
  dashboard: "primary",
  admin: "success",
  analytics: "info",
  settings: "info",
  templates: "warning",
};

export default function EnhancedBreadcrumb({ className = "" }: EnhancedBreadcrumbProps) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbPath(pathname);
  const navItem = getNavItemByPath(pathname);

  // Don't show breadcrumbs on home/dashboard
  if (pathname === "/" || pathname === "/dashboard") {
    return null;
  }

  return (
    <nav
      className={`flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 ${className}`}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center gap-2">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const isActive = isLast;

          return (
            <li key={crumb.path} className="flex items-center gap-2">
              {!isLast ? (
                <>
                  <Link
                    href={crumb.path}
                    className="hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    {crumb.name}
                  </Link>
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {crumb.name}
                  </span>
                  {navItem && (
                    <>
                      <Badge
                        size="sm"
                        color={categoryColors[navItem.category]}
                        variant="light"
                      >
                        {categoryLabels[navItem.category]}
                      </Badge>
                      {navItem.item && 
                       "type" in navItem.item && 
                       navItem.item.type && (
                        <Badge
                          size="sm"
                          color={navItem.item.type === "functional" ? "success" : "warning"}
                          variant="light"
                        >
                          {navItem.item.type === "functional" ? "Live" : "Demo"}
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

