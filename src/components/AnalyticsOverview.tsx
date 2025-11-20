"use client";

import React, { useState, useEffect } from "react";
import { useOrganization } from "@/context/OrganizationContext";

interface OverviewMetric {
  title: string;
  value: string | number;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: string;
  color: string;
  description: string;
}

interface AnalyticsOverviewData {
  overview: {
    totalCalls: number;
    answeredCalls: number;
    failedCalls: number;
    inProgressCalls: number;
    answerRate: number;
    avgHandleTime: number;
    avgHandleTimeFormatted: string;
    totalDuration: number;
    voiceCalls: number;
    chatConversations: number;
    completedCalls: number;
  };
  period: {
    start_date: string;
    end_date: string;
  };
  breakdown: {
    byStatus: {
      completed: number;
      failed: number;
      in_progress: number;
    };
    byType: {
      voice: number;
      chat: number;
    };
  };
}

export default function AnalyticsOverview() {
  const { currentOrganization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsOverviewData | null>(null);
  const [days, setDays] = useState(30); // Default to 30 days

  useEffect(() => {
    fetchAnalyticsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization?.id, days]);

  const fetchAnalyticsData = async () => {
    if (!currentOrganization?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        tenant_id: currentOrganization.id,
        days: days.toString(),
      });

      const response = await fetch(`/api/analytics/overview?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch analytics: ${response.statusText}`);
      }

      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err: any) {
      console.error("Error fetching analytics overview:", err);
      setError(err.message || "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  // Transform API data to metrics format
  const getMetrics = (): OverviewMetric[] => {
    if (!data) return [];

    const overview = data.overview;

    return [
      {
        title: "Total Calls",
        value: overview.totalCalls.toLocaleString(),
        change: "", // TODO: Calculate vs previous period
        trend: "neutral",
        icon: "📞",
        color: "bg-blue-500",
        description: "total interactions"
      },
      {
        title: "Answer Rate",
        value: `${overview.answerRate.toFixed(1)}%`,
        change: "", // TODO: Calculate vs previous period
        trend: "neutral",
        icon: "✅",
        color: "bg-green-500",
        description: "completed calls"
      },
      {
        title: "Avg Handle Time",
        value: overview.avgHandleTimeFormatted || `${overview.avgHandleTime.toFixed(1)}m`,
        change: "", // TODO: Calculate vs previous period
        trend: "neutral",
        icon: "⏱️",
        color: "bg-purple-500",
        description: "average duration"
      },
      {
        title: "Voice Calls",
        value: overview.voiceCalls.toLocaleString(),
        change: "",
        trend: "neutral",
        icon: "🎙️",
        color: "bg-yellow-500",
        description: "voice interactions"
      },
      {
        title: "Chat Conversations",
        value: overview.chatConversations.toLocaleString(),
        change: "",
        trend: "neutral",
        icon: "💬",
        color: "bg-indigo-500",
        description: "chat interactions"
      },
      {
        title: "Completed",
        value: overview.completedCalls.toLocaleString(),
        change: "",
        trend: "neutral",
        icon: "✅",
        color: "bg-emerald-500",
        description: "successful calls"
      },
    ];
  };

  const metrics = getMetrics();

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, index) => (
          <div
            key={index}
            className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800 animate-pulse"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-lg p-3 bg-gray-300 dark:bg-gray-700 w-12 h-12"></div>
              <div className="h-4 w-12 bg-gray-300 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="h-8 w-20 bg-gray-300 dark:bg-gray-700 rounded"></div>
              <div className="h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded"></div>
              <div className="h-3 w-16 bg-gray-300 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
        <p className="text-red-800 dark:text-red-200 font-semibold">Error loading analytics</p>
        <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
        <button
          onClick={fetchAnalyticsData}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || metrics.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">No analytics data available</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Start making calls to see analytics here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800"
          >
            <div className="flex items-center justify-between">
              <div className={`rounded-lg p-3 ${metric.color}`}>
                <span className="text-white text-xl">{metric.icon}</span>
              </div>
              {metric.change && (
                <div className={`text-sm font-medium ${
                  metric.trend === 'up' ? 'text-green-600' : 
                  metric.trend === 'down' ? 'text-red-600' : 
                  'text-gray-600'
                }`}>
                  {metric.change}
                </div>
              )}
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metric.value}
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                {metric.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {metric.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
