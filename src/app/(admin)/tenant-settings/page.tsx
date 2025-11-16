import type { Metadata } from "next";
import React from "react";
import TenantManagement from "@/components/TenantManagement";
import TenantConfiguration from "@/components/TenantConfiguration";
import SubtenantManagement from "@/components/SubtenantManagement";
import TenantBilling from "@/components/TenantBilling";
import TenantSecurity from "@/components/TenantSecurity";
import TenantAnalytics from "@/components/TenantAnalytics";

export const metadata: Metadata = {
  title:
    "Organization Management | AI Knowledge Bots",
  description: "Manage organizations, workspaces, and multi-organization configurations for AI knowledge bot operations.",
};

export default function TenantSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
            <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Organization Management
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage organizations, workspaces, and billing
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12">
          <TenantManagement />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 lg:col-span-6">
          <TenantConfiguration />
        </div>
        <div className="col-span-12 lg:col-span-6">
          <SubtenantManagement />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 lg:col-span-6">
          <TenantBilling />
        </div>
        <div className="col-span-12 lg:col-span-6">
          <TenantSecurity />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12">
          <TenantAnalytics />
        </div>
      </div>
    </div>
  );
}
