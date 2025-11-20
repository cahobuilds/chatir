import type { Metadata } from "next";
import React from "react";
import AgentPerformanceDetail from "@/components/AgentPerformanceDetail";

export const metadata: Metadata = {
  title: "Agent Performance Details | Analytics - TinAdmin",
  description: "Detailed performance metrics for individual agent",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AgentPerformanceDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Agent Performance Details
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Detailed performance metrics and analytics
          </p>
        </div>
      </div>

      {/* Agent Performance Detail */}
      <AgentPerformanceDetail agentId={id} />
    </div>
  );
}

