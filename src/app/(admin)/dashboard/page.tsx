import type { Metadata } from "next";
import React from "react";
import DashboardOverview from "@/components/DashboardOverview";

export const metadata: Metadata = {
  title: "Dashboard | Chat IR",
  description: "Overview of tenants, agents, and platform activity",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Overview of your tenants and agents
          </p>
        </div>
      </div>

      {/* Dashboard Overview */}
      <DashboardOverview />
    </div>
  );
}
