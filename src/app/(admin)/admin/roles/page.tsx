import type { Metadata } from "next";
import React from "react";
import RolesManagement from "@/components/admin/RolesManagement";

export const metadata: Metadata = {
  title: "Roles Management | Chat IR",
  description: "Manage system roles and permissions",
};

export default function RolesManagementPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Roles & Permissions
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage system roles and their associated permissions
          </p>
        </div>
      </div>

      {/* Roles Management */}
      <RolesManagement />
    </div>
  );
}

