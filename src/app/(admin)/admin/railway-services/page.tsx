import type { Metadata } from "next";
import React from "react";
import RailwayServicesManagement from "@/components/RailwayServicesManagement";

export const metadata: Metadata = {
  title: "Railway Services | Chat IR",
  description: "Manage Railway services for Notion MCP integration",
};

export default function RailwayServicesPage() {
  return (
    <div className="space-y-6">
      {/* Railway Services Management */}
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <RailwayServicesManagement />
      </div>
    </div>
  );
}

