import type { Metadata } from "next";
import React from "react";
import RealTimeMetrics from "@/components/RealTimeMetrics";
import LiveCallMonitoring from "@/components/LiveCallMonitoring";
import CallVolumeChart from "@/components/CallVolumeChart";
import AgentAvailability from "@/components/AgentAvailability";
import SentimentDistribution from "@/components/SentimentDistribution";
import TopCallIntents from "@/components/TopCallIntents";
import SystemHealthStatus from "@/components/SystemHealthStatus";

export const metadata: Metadata = {
  title:
    "AI Customer Care Dashboard | TinAdmin - Real-Time Operations Center",
  description: "Enterprise-grade admin platform for managing AI voice agents, chat conversations, call analytics, and omnichannel customer interactions",
};

export default function AICustomerCareDashboard() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      {/* Real-time metrics row */}
      <div className="col-span-12">
        <RealTimeMetrics />
      </div>

      {/* Main dashboard content */}
      <div className="col-span-12 space-y-6 xl:col-span-8">
        <CallVolumeChart />
        <LiveCallMonitoring />
        <TopCallIntents />
      </div>

      {/* Sidebar content */}
      <div className="col-span-12 xl:col-span-4">
        <div className="space-y-6">
          <AgentAvailability />
          <SentimentDistribution />
          <SystemHealthStatus />
        </div>
      </div>
    </div>
  );
}
