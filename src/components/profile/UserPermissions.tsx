"use client";

import React from "react";
import Badge from "../ui/badge/Badge";
import ComponentCard from "../common/ComponentCard";
import { usePermissions } from "@/hooks/usePermissions";
import { groupPermissionsByCategory } from "@/lib/permissions";

interface UserPermissionsProps {
  tenantId: string;
}

export default function UserPermissions({ tenantId }: UserPermissionsProps) {
  const { permissions, roleInfo, loading, error } = usePermissions(tenantId);
  
  if (loading) {
    return (
      <ComponentCard title="Your Permissions">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </ComponentCard>
    );
  }

  if (error || !roleInfo) {
    return (
      <ComponentCard title="Your Permissions">
        <p className="text-gray-500 dark:text-gray-400">
          {error || "Failed to load permissions"}
        </p>
      </ComponentCard>
    );
  }

  const groupedPermissions = groupPermissionsByCategory(permissions);
  const categories = Object.keys(groupedPermissions).sort();

  return (
    <ComponentCard title="Your Permissions">
      <div className="space-y-6">
        {categories.map((category) => (
          <div key={category}>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {category}
          </h4>
          <div className="flex flex-wrap gap-2">
            {groupedPermissions[category].map((permission) => (
              <Badge
                key={permission.id}
                size="sm"
                color="success"
                variant="light"
                className="flex items-center gap-1"
              >
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {permission.name}
              </Badge>
            ))}
          </div>
        </div>
        ))}
      </div>
    </ComponentCard>
  );
}

