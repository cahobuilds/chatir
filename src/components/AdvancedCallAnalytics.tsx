"use client";

import React, { useState, useEffect } from "react";
import { useOrganization } from "@/context/OrganizationContext";

interface CallAnalyticsData {
  callOutcomes: {
    successful: number;
    abandoned: number;
    transferred: number;
    escalated: number;
    failed: number;
  };
  durationDistribution: {
    p50: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
    mean: number;
    p50Formatted: string;
    p95Formatted: string;
    p99Formatted: string;
    meanFormatted: string;
  };
  qualityScores: {
    average: number;
    distribution: {
      excellent: number;
      good: number;
      average: number;
      poor: number;
    };
  };
  averageSpeedOfAnswer: number;
  averageSpeedOfAnswerFormatted: string;
  abandonRate: number;
  totalCalls: number;
  answeredCalls: number;
  abandonedCalls: number;
}

export default function AdvancedCallAnalytics() {
  const { currentOrganization } = useOrganization();
  const [data, setData] = useState<CallAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchCallAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization?.id, days]);

  const fetchCallAnalytics = async () => {
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

      const response = await fetch(`/api/analytics/calls?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch call analytics: ${response.statusText}`);
      }

      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err: any) {
      console.error("Error fetching call analytics:", err);
      setError(err.message || "Failed to load call analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800 animate-pulse">
        <div className="h-6 w-48 bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
        <p className="text-red-800 dark:text-red-200 font-semibold">Error loading call analytics</p>
        <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
        <button
          onClick={fetchCallAnalytics}
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

  const outcomeTotal = Object.values(data.callOutcomes).reduce((sum, val) => sum + val, 0);

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Advanced Call Analytics
        </h3>
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

      {/* Call Outcomes */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Call Outcomes
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400">Successful</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {data.callOutcomes.successful.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {outcomeTotal > 0 ? Math.round((data.callOutcomes.successful / outcomeTotal) * 100) : 0}%
            </p>
          </div>
          
          <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400">Abandoned</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {data.callOutcomes.abandoned.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {outcomeTotal > 0 ? Math.round((data.callOutcomes.abandoned / outcomeTotal) * 100) : 0}%
            </p>
          </div>
          
          <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400">Transferred</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {data.callOutcomes.transferred.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {outcomeTotal > 0 ? Math.round((data.callOutcomes.transferred / outcomeTotal) * 100) : 0}%
            </p>
          </div>
          
          <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 p-4 border border-orange-200 dark:border-orange-800">
            <p className="text-xs text-gray-600 dark:text-gray-400">Escalated</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {data.callOutcomes.escalated.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {outcomeTotal > 0 ? Math.round((data.callOutcomes.escalated / outcomeTotal) * 100) : 0}%
            </p>
          </div>
          
          <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400">Failed</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.callOutcomes.failed.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {outcomeTotal > 0 ? Math.round((data.callOutcomes.failed / outcomeTotal) * 100) : 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Duration Distribution */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Call Duration Distribution
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400">P50 (Median)</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {data.durationDistribution.p50Formatted}
            </p>
          </div>
          
          <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400">P95</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {data.durationDistribution.p95Formatted}
            </p>
          </div>
          
          <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400">P99</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {data.durationDistribution.p99Formatted}
            </p>
          </div>
          
          <div className="rounded-lg bg-teal-50 dark:bg-teal-900/20 p-4 border border-teal-200 dark:border-teal-800">
            <p className="text-xs text-gray-600 dark:text-gray-400">Average</p>
            <p className="text-xl font-bold text-teal-600 dark:text-teal-400">
              {data.durationDistribution.meanFormatted}
            </p>
          </div>
          
          <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400">Range</p>
            <p className="text-xs font-medium text-gray-900 dark:text-white">
              {formatDuration(data.durationDistribution.min)} - {formatDuration(data.durationDistribution.max)}
            </p>
          </div>
        </div>
      </div>

      {/* Quality Scores & Other Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-4 border border-emerald-200 dark:border-emerald-800">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Average Quality Score</p>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {data.qualityScores.average.toFixed(1)}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-green-600 dark:text-green-400">Excellent: </span>
              <span className="font-medium">{data.qualityScores.distribution.excellent}</span>
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-400">Good: </span>
              <span className="font-medium">{data.qualityScores.distribution.good}</span>
            </div>
            <div>
              <span className="text-yellow-600 dark:text-yellow-400">Average: </span>
              <span className="font-medium">{data.qualityScores.distribution.average}</span>
            </div>
            <div>
              <span className="text-red-600 dark:text-red-400">Poor: </span>
              <span className="font-medium">{data.qualityScores.distribution.poor}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-cyan-50 dark:bg-cyan-900/20 p-4 border border-cyan-200 dark:border-cyan-800">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Avg Speed of Answer</p>
          <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
            {data.averageSpeedOfAnswerFormatted || formatDuration(data.averageSpeedOfAnswer)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Time to first response
          </p>
        </div>

        <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 p-4 border border-rose-200 dark:border-rose-800">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Abandon Rate</p>
          <p className="text-3xl font-bold text-rose-600 dark:text-rose-400">
            {data.abandonRate.toFixed(2)}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {data.abandonedCalls} of {data.totalCalls} calls abandoned
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

