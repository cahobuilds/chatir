"use client";

import React, { useState, useRef, useEffect } from "react";
import { useOrganization } from "@/context/OrganizationContext";
import { BuildingOfficeIcon, ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import Badge from "@/components/ui/badge/Badge";

export default function OrganizationSwitcher() {
  const { currentOrganization, organizations, loading, switchOrganization } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Don't show if user has only one organization (unless they're superadmin)
  if (loading || organizations.length <= 1) {
    // Show for superadmins even with one org (they might get access to more)
    const isSuperAdmin = currentOrganization?.role === "system_admin" || currentOrganization?.role === "super_admin";
    if (!isSuperAdmin && organizations.length <= 1) {
      return null;
    }
  }

  const handleSwitch = async (organizationId: string) => {
    if (organizationId === currentOrganization?.id) {
      setIsOpen(false);
      return;
    }
    await switchOrganization(organizationId);
    setIsOpen(false);
  };

  const getRoleBadgeColor = (role: string): "primary" | "success" | "error" | "warning" | "info" | "light" | "dark" => {
    if (role === "system_admin" || role === "super_admin") return "error";
    if (role === "organization_admin" || role === "tenant_admin") return "primary";
    if (role === "agent") return "success";
    return "light";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
        aria-label="Switch organization"
      >
        <BuildingOfficeIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <span className="max-w-[120px] truncate">
          {currentOrganization?.name || "Select Organization"}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 dark:bg-gray-800 dark:border-gray-700">
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
              Organizations
            </div>
            <div className="max-h-64 overflow-y-auto">
              {organizations.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  No organizations available
                </div>
              ) : (
                organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleSwitch(org.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      currentOrganization?.id === org.id
                        ? "bg-indigo-50 dark:bg-indigo-900/20"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <BuildingOfficeIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {org.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            size="sm"
                            color={getRoleBadgeColor(org.role)}
                            variant="light"
                          >
                            {org.role === "system_admin"
                              ? "System Admin"
                              : org.role === "super_admin"
                              ? "Super Admin"
                              : org.role === "organization_admin" || org.role === "tenant_admin"
                              ? "Admin"
                              : org.role}
                          </Badge>
                          {org.tier && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {org.tier}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {currentOrganization?.id === org.id && (
                      <CheckIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

