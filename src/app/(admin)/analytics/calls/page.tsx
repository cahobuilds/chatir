import type { Metadata } from "next";
import React from "react";
import AdvancedCallAnalytics from "@/components/AdvancedCallAnalytics";
import CallVolumeAnalytics from "@/components/CallVolumeAnalytics";
import PerformanceMetrics from "@/components/PerformanceMetrics";
import QualityMetrics from "@/components/QualityMetrics";

export const metadata: Metadata = {
  title: "Call Analytics | Analytics - TinAdmin",
  description: "Advanced call analytics, outcomes, and quality metrics",
};

export default function CallAnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Call Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Advanced call analytics, outcomes, duration distribution, and quality metrics
          </p>
        </div>
      </div>

      {/* Call Volume Trends */}
      <CallVolumeAnalytics />

      {/* Advanced Call Analytics */}
      <AdvancedCallAnalytics />

      {/* Performance and Quality Metrics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PerformanceMetrics />
        <QualityMetrics />
      </div>
    </div>
  );
}

