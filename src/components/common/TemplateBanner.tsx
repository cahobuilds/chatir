"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { getNavItemByPath } from "@/config/navigation";
import Badge from "../ui/badge/Badge";

export default function TemplateBanner() {
  const pathname = usePathname();
  const navItem = getNavItemByPath(pathname);

  // Only show banner on template pages
  if (
    !navItem ||
    !("type" in navItem.item) ||
    navItem.item.type !== "template"
  ) {
    return null;
  }

  return (
    <div className="mb-6 rounded-xl border border-warning-200 bg-warning-50 p-4 dark:bg-warning-500/10 dark:border-warning-500/20">
      <div className="flex items-center gap-3">
        <Badge size="sm" color="warning" variant="solid">
          Demo
        </Badge>
        <div className="flex-1">
          <p className="text-sm font-medium text-warning-800 dark:text-warning-200">
            Template Page
          </p>
          <p className="text-xs text-warning-700 dark:text-warning-300 mt-0.5">
            This is a UI template for reference. It does not have functional backend integration.
          </p>
        </div>
      </div>
    </div>
  );
}

