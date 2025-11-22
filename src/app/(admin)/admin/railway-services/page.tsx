import type { Metadata } from "next";
import React from "react";
import RailwayServicesManagement from "@/components/RailwayServicesManagement";

export const metadata: Metadata = {
  title: "Railway Services | Multi-Tenant AI SaaS Platform",
  description: "Manage Railway services for Notion MCP integration",
};

export default function RailwayServicesPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Railway Services
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create and manage Railway services for Notion MCP integration
          </p>
        </div>
      </div>

      {/* Railway Services Management */}
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12">
          <RailwayServicesManagement />
        </div>
      </div>
    </div>
  );
}

