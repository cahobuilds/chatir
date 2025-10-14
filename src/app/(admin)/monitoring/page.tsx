import type { Metadata } from "next";
import React from "react";
import LiveCallMonitoring from "@/components/LiveCallMonitoring";
import CallInterventionPanel from "@/components/CallInterventionPanel";
import AgentStatusOverview from "@/components/AgentStatusOverview";
import CallQueueStatus from "@/components/CallQueueStatus";
import RealTimeAlerts from "@/components/RealTimeAlerts";

export const metadata: Metadata = {
  title:
    "Live Call Monitoring | TinAdmin - AI Customer Care Dashboard",
  description: "Real-time call monitoring, intervention controls, and agent supervision for AI customer care operations.",
};

export default function CallMonitoringPage() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 lg:col-span-8">
        <LiveCallMonitoring />
      </div>
      <div className="col-span-12 lg:col-span-4 space-y-6">
        <CallInterventionPanel />
        <AgentStatusOverview />
        <CallQueueStatus />
        <RealTimeAlerts />
      </div>
    </div>
  );
}
