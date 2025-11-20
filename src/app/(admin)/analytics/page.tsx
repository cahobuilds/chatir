import type { Metadata } from "next";
import React from "react";
import AnalyticsOverview from "@/components/AnalyticsOverview";
import RealTimeMetrics from "@/components/RealTimeMetrics";
import CallVolumeAnalytics from "@/components/CallVolumeAnalytics";
import AdvancedCallAnalytics from "@/components/AdvancedCallAnalytics";
import PerformanceMetrics from "@/components/PerformanceMetrics";
import QualityMetrics from "@/components/QualityMetrics";
import CustomerExperienceMetrics from "@/components/CustomerExperienceMetrics";

export const metadata: Metadata = {
  title:
    "Analytics & Reporting | AI Customer Care - TinAdmin",
  description: "Comprehensive performance analytics and business intelligence for AI customer care operations",
};

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics Overview
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive performance analytics and business intelligence
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select className="rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
            <option>Custom range</option>
          </select>
          <button className="rounded-lg bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700">
            Export Report
          </button>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <AnalyticsOverview />

      {/* Real-Time Analytics */}
      <RealTimeMetrics />

      {/* Main Analytics Charts - Time Series */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CallVolumeAnalytics />
        <PerformanceMetrics />
      </div>

      {/* Advanced Call Analytics - Outcomes & Quality */}
      <AdvancedCallAnalytics />

      {/* Quality Metrics Overview - Full Width */}
      <QualityMetrics />

      {/* Customer Experience Metrics */}
      <CustomerExperienceMetrics />
    </div>
  );
}
