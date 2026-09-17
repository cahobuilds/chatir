"use client";
import React, { useEffect, useRef, useCallback, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useOrganization } from "../context/OrganizationContext";
import { useAuth } from "@/hooks/useAuth";
import {
  ChevronDownIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";
import SidebarWidget from "./SidebarWidget";
import {
  navigationConfig,
  NavItem,
  searchNavItems,
  getAllNavItems,
} from "../config/navigation";
import Input from "../components/form/input/InputField";
import Badge from "../components/ui/badge/Badge";
import { createClient } from "@/lib/supabase/client";

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { currentOrganization } = useOrganization();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [organizationLogo, setOrganizationLogo] = useState<string | null>(null);
  const [organizationWordmark, setOrganizationWordmark] = useState<string | null>(null);
  const [isPlatformStaff, setIsPlatformStaff] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const { user } = useAuth();
  const supabase = createClient();
  // Track multiple open submenus using Set of keys
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set());
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Determine whether the user is PLATFORM staff (platform_admin/operator/billing). A company
  // admin is admin of their own organization only, never platform staff, so they must not see
  // platform-only tools. Uses the canonical role model via /api/permissions/check.
  useEffect(() => {
    const checkPlatformStatus = async () => {
      if (!user || !currentOrganization?.id) {
        setIsPlatformStaff(false);
        setCheckingAdmin(false);
        return;
      }

      try {
        const res = await fetch(`/api/permissions/check?tenant_id=${currentOrganization.id}`);
        if (res.ok) {
          const data = await res.json();
          setIsPlatformStaff(data.role_info?.scope === 'platform');
        } else {
          setIsPlatformStaff(false);
        }
      } catch (error) {
        console.error('Error checking platform status:', error);
        setIsPlatformStaff(false);
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkPlatformStatus();
  }, [user, currentOrganization]);

  // Fetch organization logo and wordmark when organization changes
  useEffect(() => {
    const fetchOrganizationBranding = async () => {
      if (!currentOrganization?.id) {
        setOrganizationLogo(null);
        setOrganizationWordmark(null);
        return;
      }

      try {
        const response = await fetch(`/api/tenants/${currentOrganization.id}`);
        if (response.ok) {
          const data = await response.json();
          const tenant = data.tenant;
          const branding = tenant?.branding;
          
          let parsedBranding: any = {};
          if (branding && typeof branding === 'object') {
            parsedBranding = branding;
          } else if (branding && typeof branding === 'string') {
            try {
              parsedBranding = JSON.parse(branding);
            } catch {
              parsedBranding = {};
            }
          }

          setOrganizationLogo(parsedBranding.logo_url || null);
          setOrganizationWordmark(parsedBranding.wordmark_url || null);
        } else {
          setOrganizationLogo(null);
          setOrganizationWordmark(null);
        }
      } catch (error) {
        console.error('Failed to fetch organization branding:', error);
        setOrganizationLogo(null);
        setOrganizationWordmark(null);
      }
    };

    fetchOrganizationBranding();
  }, [currentOrganization?.id]);

  // Filter navigation based on search
  const filteredNavigation = useMemo(() => {
    if (!searchQuery.trim()) {
      return navigationConfig;
    }

    const searchResults = searchNavItems(searchQuery);
    const categoryMap = new Map<string, NavItem>();

    // Group results by category
    searchResults.forEach((result) => {
      const category = result.category;
      if (!categoryMap.has(category)) {
        const originalNav = navigationConfig.find((n) => n.category === category);
        if (originalNav) {
          categoryMap.set(category, {
            ...originalNav,
            subItems: originalNav.subItems?.filter((sub) =>
              searchResults.some((r) => r.path === sub.path)
            ),
          });
        }
      }
    });

    return Array.from(categoryMap.values());
  }, [searchQuery]);

  // Group navigation by category
  const navigationByCategory = useMemo(() => {
    const categories: Record<string, NavItem[]> = {
      dashboard: [],
      admin: [],
      analytics: [],
      settings: [],
      templates: [],
    };

    filteredNavigation.forEach((nav) => {
      if (categories[nav.category]) {
        categories[nav.category].push(nav);
      }
    });

    return categories;
  }, [filteredNavigation]);

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  // Auto-open submenu if current path matches (but don't close others)
  useEffect(() => {
    navigationConfig.forEach((nav, index) => {
      if (nav.subItems) {
        nav.subItems.forEach((subItem) => {
          if (isActive(subItem.path)) {
            const key = `${nav.category}-${index}`;
            setOpenSubmenus((prev) => new Set(prev).add(key));
          }
        });
      }
    });
  }, [pathname, isActive]);

  // Set default open state for submenus
  useEffect(() => {
    navigationConfig.forEach((nav, index) => {
      if (nav.subItems && nav.defaultOpen) {
        const key = `${nav.category}-${index}`;
        setOpenSubmenus((prev) => new Set(prev).add(key));
      }
    });
  }, []);

  // Calculate submenu heights for all open submenus
  useEffect(() => {
    openSubmenus.forEach((key) => {
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    });
  }, [openSubmenus]);

  const handleSubmenuToggle = (index: number, category: string) => {
    const key = `${category}-${index}`;
    setOpenSubmenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const renderMenuItems = (navItems: NavItem[], category: string) => (
    <ul className="flex flex-col gap-1">
      {navItems.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, category)}
              className={`menu-item group ${
                openSubmenus.has(`${category}-${index}`)
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={`${
                  openSubmenus.has(`${category}-${index}`)
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <>
                  {nav.type === "template" && (
                    <Badge size="sm" color="warning" variant="light" className="ml-auto mr-2">
                      Demo
                    </Badge>
                  )}
                  {nav.subItems && (
                    <ChevronDownIcon
                      className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                        openSubmenus.has(`${category}-${index}`)
                          ? "rotate-180 text-brand-500"
                          : ""
                      }`}
                    />
                  )}
                </>
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <>
                    <span className="menu-item-text">{nav.name}</span>
                    {nav.badge === "new" && (
                      <Badge size="sm" color={isActive(nav.path) ? "primary" : "light"} variant="light" className="ml-auto">
                        NEW
                      </Badge>
                    )}
                    {nav.badge === "pro" && (
                      <Badge size="sm" color={isActive(nav.path) ? "info" : "light"} variant="light" className="ml-auto">
                        PRO
                      </Badge>
                    )}
                    {nav.type === "template" && (
                      <Badge size="sm" color="warning" variant="light" className="ml-auto">
                        Demo
                      </Badge>
                    )}
                  </>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${category}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenus.has(`${category}-${index}`)
                    ? `${subMenuHeight[`${category}-${index}`] || 0}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems
                  .filter((subItem) => {
                    // Filter out platform-only items if the user is not platform staff.
                    if ((subItem.platformOnly || subItem.adminOnly) && !isPlatformStaff) {
                      return false;
                    }
                    return true;
                  })
                  .map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      href={subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.icon && (
                        <span className="mr-2 flex-shrink-0">
                          {subItem.icon}
                        </span>
                      )}
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.badge === "new" && (
                          <Badge
                            size="sm"
                            color={
                              isActive(subItem.path) ? "primary" : "light"
                            }
                            variant="light"
                            className="menu-dropdown-badge"
                          >
                            new
                          </Badge>
                        )}
                        {subItem.badge === "pro" && (
                          <Badge
                            size="sm"
                            color={
                              isActive(subItem.path) ? "info" : "light"
                            }
                            variant="light"
                            className="menu-dropdown-badge-pro"
                          >
                            pro
                          </Badge>
                        )}
                        {subItem.badge === "demo" && (
                          <Badge
                            size="sm"
                            color="warning"
                            variant="light"
                            className="menu-dropdown-badge"
                          >
                            demo
                          </Badge>
                        )}
                        {subItem.type === "functional" && !subItem.badge && (
                          <span className="h-2 w-2 rounded-full bg-green-500"></span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  const categoryLabels: Record<string, string> = {
    dashboard: "Dashboard",
    admin: "Platform",
    analytics: "Analytics",
    settings: "Settings",
    templates: "Templates",
  };

  return (
    <aside
      // "dark" is added as a literal class (not a dark: variant) so this subtree always
      // renders in its dark-mode colors regardless of the app-wide light/dark toggle -
      // this is the permanent charcoal sidebar from the Chat IR visual rebrand. bg/text/
      // border below are deliberately NOT gated behind dark: since they must never change.
      className={`dark fixed flex flex-col xl:mt-0 top-0 px-5 left-0 bg-stone-900 text-gray-100 border-stone-800 h-full transition-all duration-300 ease-in-out z-50 border-r 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        xl:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex items-center gap-3 ${
          !isExpanded && !isHovered ? "xl:justify-center" : "justify-start"
        }`}
      >
        <Link href="/dashboard" className="flex items-center gap-3">
          {/* Logo Icon - Always visible */}
          {organizationLogo ? (
            <Image
              src={organizationLogo}
              alt={currentOrganization?.name || "Organization Logo"}
              width={isExpanded || isHovered || isMobileOpen ? 40 : 32}
              height={isExpanded || isHovered || isMobileOpen ? 40 : 32}
              className={`object-contain ${
                isExpanded || isHovered || isMobileOpen ? "h-10 w-10" : "h-8 w-8"
              }`}
              unoptimized
            />
          ) : (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              width={isExpanded || isHovered || isMobileOpen ? 40 : 32}
              height={isExpanded || isHovered || isMobileOpen ? 40 : 32}
              className={isExpanded || isHovered || isMobileOpen ? "h-10 w-10" : "h-8 w-8"}
            />
          )}
          
          {/* Wordmark - Only visible when expanded */}
          {(isExpanded || isHovered || isMobileOpen) && (
            <>
              {organizationWordmark ? (
                <Image
                  src={organizationWordmark}
                  alt={currentOrganization?.name || "Organization Wordmark"}
                  width={150}
                  height={40}
                  className="h-10 w-auto object-contain max-w-[150px]"
                  unoptimized
                />
              ) : (
                <span className="text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap">
                  {currentOrganization?.name || "AI Bots"}
                </span>
              )}
            </>
          )}
        </Link>
      </div>

      {/* Search Bar */}
      {(isExpanded || isHovered || isMobileOpen) && (
        <div className="mb-4">
          <Input
            type="text"
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
      )}

      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-6">
            {/* Dashboard Section */}
            {navigationByCategory.dashboard.length > 0 && (
              <div>
                <h2
                  className={`mb-4 text-xs uppercase flex leading-5 text-gray-400 ${
                    !isExpanded && !isHovered
                      ? "xl:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    categoryLabels.dashboard
                  ) : (
                    <EllipsisHorizontalIcon className="w-5 h-5" />
                  )}
                </h2>
                {renderMenuItems(navigationByCategory.dashboard, "dashboard")}
              </div>
            )}

            {/* Platform Section - Only visible to platform staff */}
            {isPlatformStaff && navigationByCategory.admin.length > 0 && (
              <div>
                <h2
                  className={`mb-4 text-xs uppercase flex leading-5 text-gray-400 ${
                    !isExpanded && !isHovered
                      ? "xl:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    categoryLabels.admin
                  ) : (
                    <EllipsisHorizontalIcon className="w-5 h-5" />
                  )}
                </h2>
                {renderMenuItems(navigationByCategory.admin, "admin")}
              </div>
            )}

            {/* Analytics Section - visible to every member of an organization */}
            {navigationByCategory.analytics && navigationByCategory.analytics.length > 0 && (
              <div>
                <h2
                  className={`mb-4 text-xs uppercase flex leading-5 text-gray-400 ${
                    !isExpanded && !isHovered
                      ? "xl:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    categoryLabels.analytics
                  ) : (
                    <EllipsisHorizontalIcon className="w-5 h-5" />
                  )}
                </h2>
                {renderMenuItems(navigationByCategory.analytics, "analytics")}
              </div>
            )}

            {/* Settings Section - visible to every member of an organization */}
            {navigationByCategory.settings.length > 0 && (
              <div>
                <h2
                  className={`mb-4 text-xs uppercase flex leading-5 text-gray-400 ${
                    !isExpanded && !isHovered
                      ? "xl:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    categoryLabels.settings
                  ) : (
                    <EllipsisHorizontalIcon className="w-5 h-5" />
                  )}
                </h2>
                {renderMenuItems(navigationByCategory.settings, "settings")}
              </div>
            )}

            {/* Templates Section */}
            {navigationByCategory.templates.length > 0 && (
              <div>
                <h2
                  className={`mb-4 text-xs uppercase flex leading-5 text-gray-400 ${
                    !isExpanded && !isHovered
                      ? "xl:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    <>
                      {categoryLabels.templates}
                      <Badge size="sm" color="warning" variant="light" className="ml-2">
                        Demo
                      </Badge>
                    </>
                  ) : (
                    <EllipsisHorizontalIcon className="w-5 h-5" />
                  )}
                </h2>
                {renderMenuItems(navigationByCategory.templates, "templates")}
              </div>
            )}

            {/* No Results Message */}
            {searchQuery && filteredNavigation.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                <p className="text-sm">No pages found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </nav>
        {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
