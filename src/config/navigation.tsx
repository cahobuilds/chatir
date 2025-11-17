import React from "react";
import {
  AiIcon,
  UserCircleIcon,
  BoxIcon,
  PlugInIcon,
  CallIcon,
  ChatIcon,
} from "../icons";

export type PageType = "functional" | "template";
export type NavCategory = "dashboard" | "admin" | "settings" | "templates";

export interface NavSubItem {
  name: string;
  path: string;
  type: PageType;
  badge?: "new" | "pro" | "demo";
  description?: string;
}

export interface NavItem {
  name: string;
  icon: React.ReactNode;
  category: NavCategory;
  path?: string;
  subItems?: NavSubItem[];
  type: PageType;
  badge?: "new" | "pro" | "demo";
  description?: string;
  defaultOpen?: boolean; // For templates section, default to collapsed
}

// Navigation configuration
export const navigationConfig: NavItem[] = [
  // Dashboard - Multiple items
  {
    name: "Dashboard",
    icon: <AiIcon />,
    category: "dashboard",
    path: "/dashboard",
    type: "functional",
    description: "Overview of organizations and agents",
  },
  {
    name: "Voice Agents",
    icon: <CallIcon />,
    category: "dashboard",
    path: "/agents/voice",
    type: "functional",
    badge: "new",
    description: "Manage voice AI agents",
  },
  {
    name: "Chat Agents",
    icon: <ChatIcon />,
    category: "dashboard",
    path: "/agents/chat",
    type: "functional",
    badge: "new",
    description: "Manage chat AI agents",
  },

  // Admin - Functional features
  {
    name: "Admin",
    icon: <BoxIcon />,
    category: "admin",
    type: "functional",
    defaultOpen: true,
    subItems: [
      {
        name: "Users",
        path: "/users",
        type: "functional",
        badge: "new",
        description: "User management",
      },
      {
        name: "Roles & Permissions",
        path: "/admin/roles",
        type: "functional",
        badge: "new",
        description: "Manage roles and permissions",
      },
      // Future functional items can be added here
      // {
      //   name: "Tenants",
      //   path: "/tenants",
      //   type: "functional",
      //   description: "Tenant management",
      // },
      // {
      //   name: "Interactions",
      //   path: "/interactions",
      //   type: "functional",
      //   description: "View interaction history",
      // },
    ],
  },

  // Settings - Configuration pages
  {
    name: "Settings",
    icon: <UserCircleIcon />,
    category: "settings",
    type: "functional",
    defaultOpen: false,
    subItems: [
      {
        name: "Account Settings",
        path: "/profile/settings",
        type: "functional",
        badge: "new",
        description: "View your roles and permissions",
      },
      {
        name: "Edit Profile",
        path: "/profile/edit",
        type: "functional",
        description: "Edit your personal information",
      },
      {
        name: "General Settings",
        path: "/settings",
        type: "functional",
        badge: "new",
        description: "General application settings",
      },
      {
        name: "Organization Settings",
        path: "/tenant-settings",
        type: "functional",
        badge: "pro",
        description: "Organization-specific configuration",
      },
      // Future settings items
      // {
      //   name: "API Keys",
      //   path: "/settings/api-keys",
      //   type: "functional",
      //   description: "Manage API keys",
      // },
      // {
      //   name: "Billing",
      //   path: "/settings/billing",
      //   type: "functional",
      //   description: "Billing and subscription",
      // },
    ],
  },

  // Templates - UI examples (collapsed by default)
  {
    name: "Templates",
    icon: <PlugInIcon />,
    category: "templates",
    type: "template",
    defaultOpen: false, // Collapsed by default
    subItems: [
      {
        name: "Analytics",
        path: "/analytics",
        type: "template",
        badge: "demo",
        description: "Analytics dashboard template",
      },
      {
        name: "Monitoring",
        path: "/monitoring",
        type: "template",
        badge: "demo",
        description: "Live call monitoring template",
      },
      {
        name: "Quality Control",
        path: "/quality",
        type: "template",
        badge: "demo",
        description: "Quality assurance template",
      },
      {
        name: "Call History",
        path: "/calls/history",
        type: "template",
        badge: "demo",
        description: "Call history template",
      },
      {
        name: "Knowledge Base",
        path: "/knowledge",
        type: "template",
        badge: "demo",
        description: "Knowledge base template",
      },
      {
        name: "Conversation Flows",
        path: "/flows",
        type: "template",
        badge: "demo",
        description: "Flow builder template",
      },
      {
        name: "Phone Numbers",
        path: "/numbers",
        type: "template",
        badge: "demo",
        description: "Phone number management template",
      },
      {
        name: "Integrations",
        path: "/integrations",
        type: "template",
        badge: "demo",
        description: "Integrations template",
      },
      {
        name: "Webhooks",
        path: "/webhooks",
        type: "template",
        badge: "demo",
        description: "Webhook configuration template",
      },
      {
        name: "API Playground",
        path: "/api-playground",
        type: "template",
        badge: "demo",
        description: "API testing template",
      },
    ],
  },
];

// Helper function to get all navigation items (flattened for search)
export function getAllNavItems(): Array<NavSubItem & { category: NavCategory; parentName: string }> {
  const items: Array<NavSubItem & { category: NavCategory; parentName: string }> = [];
  
  navigationConfig.forEach((nav) => {
    if (nav.path) {
      items.push({
        ...nav,
        category: nav.category,
        parentName: nav.name,
        name: nav.name,
        path: nav.path,
        type: nav.type,
      } as any);
    }
    if (nav.subItems) {
      nav.subItems.forEach((subItem) => {
        items.push({
          ...subItem,
          category: nav.category,
          parentName: nav.name,
        });
      });
    }
  });
  
  return items;
}

// Helper function to search navigation items
export function searchNavItems(query: string): Array<NavSubItem & { category: NavCategory; parentName: string }> {
  const allItems = getAllNavItems();
  const lowerQuery = query.toLowerCase();
  
  return allItems.filter((item) => {
    return (
      item.name.toLowerCase().includes(lowerQuery) ||
      item.path?.toLowerCase().includes(lowerQuery) ||
      item.description?.toLowerCase().includes(lowerQuery) ||
      item.parentName.toLowerCase().includes(lowerQuery)
    );
  });
}

// Helper function to get navigation item by path
export function getNavItemByPath(path: string): {
  item: NavSubItem | NavItem;
  category: NavCategory;
  parentName?: string;
} | null {
  // Normalize path (remove trailing slash)
  const normalizedPath = path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path;
  
  for (const nav of navigationConfig) {
    if (nav.path === normalizedPath) {
      return { item: nav, category: nav.category };
    }
    if (nav.subItems) {
      for (const subItem of nav.subItems) {
        if (subItem.path === normalizedPath) {
          return {
            item: subItem,
            category: nav.category,
            parentName: nav.name,
          };
        }
      }
    }
  }
  return null;
}

// Helper function to get breadcrumb path
export function getBreadcrumbPath(pathname: string): Array<{ name: string; path: string }> {
  const breadcrumbs: Array<{ name: string; path: string }> = [
    { name: "Home", path: "/" },
  ];

  const navItem = getNavItemByPath(pathname);
  if (navItem) {
    if (navItem.parentName) {
      breadcrumbs.push({
        name: navItem.parentName,
        path: "#", // Parent doesn't have direct path
      });
    }
    breadcrumbs.push({
      name: "item" in navItem.item ? navItem.item.name : navItem.item.name,
      path: pathname,
    });
  } else {
    // Fallback: extract from pathname
    const parts = pathname.split("/").filter(Boolean);
    parts.forEach((part, index) => {
      const path = "/" + parts.slice(0, index + 1).join("/");
      const name = part
        .split("-")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
      breadcrumbs.push({ name, path });
    });
  }

  return breadcrumbs;
}

