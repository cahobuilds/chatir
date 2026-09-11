import type { Metadata } from "next";
import React from "react";
import AgentPerformanceList from "@/components/AgentPerformanceList";

export const metadata: Metadata = {
  title: "Agent Performance | Chat IR",
  description: "View and analyze individual agent performance metrics",
};

export default function AgentPerformancePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Agent Performance
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Individual agent performance metrics and rankings
          </p>
        </div>
      </div>

      {/* Agent Performance List */}
      <AgentPerformanceList />
    </div>
  );
}

