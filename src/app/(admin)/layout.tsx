"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import EnhancedBreadcrumb from "@/components/common/EnhancedBreadcrumb";
import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login?redirect=' + encodeURIComponent(pathname));
    }
  }, [user, loading, router, pathname]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  // Route-specific styles for the main content container
  const getRouteSpecificStyles = () => {
    switch (pathname) {
      case "/text-generator":
        return "";
      case "/code-generator":
        return "";
      case "/image-generator":
        return "";
      case "/video-generator":
        return "";
      default:
        return "p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6";
    }
  };

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "xl:ml-[290px]"
    : "xl:ml-[90px]";

  return (
    <div className="min-h-screen xl:flex">
      {/* Sidebar and Backdrop */}
      <AppSidebar />
      <Backdrop />
      {/* Main Content Area */}
      <div
        className={`flex-1 transition-all  duration-300 ease-in-out ${mainContentMargin}`}
      >
        {/* Header */}
        <AppHeader />
        {/* Breadcrumbs */}
        <div className="px-4 md:px-6 pt-4">
          <EnhancedBreadcrumb />
        </div>
        {/* Page Content */}
        <div className={getRouteSpecificStyles()}>{children}</div>
      </div>
    </div>
  );
}
