import type { Metadata } from "next";
import React from "react";
import CallHistoryFilters from "@/components/CallHistoryFilters";
import CallHistoryTable from "@/components/CallHistoryTable";
import CallDetailsPanel from "@/components/CallDetailsPanel";

export const metadata: Metadata = {
  title:
    "Call History & Recordings | AI Customer Care - TinAdmin",
  description: "Complete call log with recordings, transcripts, and analytics for AI customer care operations",
};

export default function CallHistoryPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Call History & Recordings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Complete call log with recordings, transcripts, and analytics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
            Export Data
          </button>
          <button className="rounded-lg bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700">
            Advanced Search
          </button>
        </div>
      </div>

      {/* Filters */}
      <CallHistoryFilters />

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CallHistoryTable />
        </div>
        <div>
          <CallDetailsPanel />
        </div>
      </div>
    </div>
  );
}
