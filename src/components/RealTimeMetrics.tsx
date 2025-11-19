"use client";

import React, { useState, useEffect } from "react";
import { useOrganization } from "@/context/OrganizationContext";

interface RealtimeData {
  liveCallVolume: {
    activeCalls: number;
    queueLength: number;
    avgWaitTime: number;
    longestWaitTime: number;
    avgWaitTimeFormatted: string;
    longestWaitTimeFormatted: string;
  };
  agentStatus: {
    online: number;
    busy: number;
    idle: number;
    total: number;
  };
  liveMetrics: {
    currentHourCalls: number;
    currentHourCompleted: number;
    currentHourAnswerRate: number;
    activeConversations: number;
    currentHourStart: string;
  };
  systemHealth: {
    apiResponseTime: number | null;
    errorRate: number;
    totalErrors: number;
    uptime: number;
    totalInteractionsLast24h: number;
  };
  timestamp: string;
}

export default function RealTimeMetrics() {
  const { currentOrganization } = useOrganization();
  const [data, setData] = useState<RealtimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrganization?.id) {
      setLoading(false);
      return;
    }

    fetchRealtimeData();
    
    // Poll every 10 seconds for real-time updates
    const interval = setInterval(() => {
      fetchRealtimeData();
    }, 10000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization?.id]);

  const fetchRealtimeData = async () => {
    if (!currentOrganization?.id) return;

    try {
      setError(null);
      const params = new URLSearchParams({
        tenant_id: currentOrganization.id,
      });

      const response = await fetch(`/api/analytics/realtime?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch real-time data: ${response.statusText}`);
      }

      const realtimeData = await response.json();
      setData(realtimeData);
      setLoading(false);
    } catch (err: any) {
      console.error("Error fetching real-time metrics:", err);
      setError(err.message || "Failed to load real-time data");
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Real-Time Operations
          </h2>
          <div className="h-2 w-2 rounded-full bg-gray-400 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900 animate-pulse">
              <div className="h-12 w-12 bg-gray-300 dark:bg-gray-700 rounded-lg mb-3"></div>
              <div className="h-8 w-20 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
        <p className="text-red-800 dark:text-red-200 font-semibold">Error loading real-time metrics</p>
        <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
        <button
          onClick={fetchRealtimeData}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const metrics = [
    {
      title: "Active Calls",
      value: data.liveCallVolume.activeCalls.toLocaleString(),
      icon: "📞",
      color: "bg-blue-500",
    },
    {
      title: "Calls in Queue",
      value: data.liveCallVolume.queueLength.toLocaleString(),
      icon: "⏳",
      color: "bg-yellow-500",
    },
    {
      title: "Avg Wait Time",
      value: data.liveCallVolume.avgWaitTimeFormatted || formatDuration(data.liveCallVolume.avgWaitTime),
      icon: "⏱️",
      color: "bg-green-500",
    },
    {
      title: "Online Agents",
      value: `${data.agentStatus.busy}/${data.agentStatus.total}`,
      icon: "👥",
      color: "bg-purple-500",
    },
    {
      title: "Hour Answer Rate",
      value: `${data.liveMetrics.currentHourAnswerRate.toFixed(1)}%`,
      icon: "✅",
      color: "bg-emerald-500",
    },
    {
      title: "Error Rate",
      value: `${data.systemHealth.errorRate.toFixed(2)}%`,
      icon: "⚠️",
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Real-Time Operations
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Last updated: {new Date(data.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Live
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`rounded-lg p-2 ${metric.color}`}>
                <span className="text-white text-lg">{metric.icon}</span>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metric.value}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {metric.title}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Details */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Current Hour Calls</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {data.liveMetrics.currentHourCalls} ({data.liveMetrics.currentHourCompleted} completed)
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Agent Status</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {data.agentStatus.busy} busy, {data.agentStatus.idle} idle
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">System Uptime</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {data.systemHealth.uptime.toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (minutes < 60) {
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
