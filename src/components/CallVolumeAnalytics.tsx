"use client";

import React, { useState, useEffect } from "react";
import { useOrganization } from "@/context/OrganizationContext";

interface TimeSeriesData {
  timeSeries: Array<{
    period: string;
    totalCalls: number;
    completedCalls: number;
    failedCalls: number;
    inProgressCalls: number;
    voiceCalls: number;
    chatConversations: number;
    avgDuration: number;
    answerRate: number;
  }>;
  period: {
    start_date: string;
    end_date: string;
    granularity: string;
  };
  peakAnalysis: {
    busiestHour: number;
    busiestHourFormatted: string;
    busiestDay: string;
    busiestDayOfWeek: number;
    busiestDayOfWeekName: string;
    busiestHourCount: number;
    busiestDayCount: number;
    busiestDayOfWeekCount: number;
  } | null;
  growthMetrics: {
    monthOverMonth: number | null;
    yearOverYear: number | null;
    currentPeriodCount: number;
    previousPeriodCount: number;
    yoyPeriodCount: number;
  };
}

export default function CallVolumeAnalytics() {
  const { currentOrganization } = useOrganization();
  const [data, setData] = useState<TimeSeriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [granularity, setGranularity] = useState<"day" | "hour" | "week" | "month">("day");

  useEffect(() => {
    fetchTimeSeriesData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization?.id, days, granularity]);

  const fetchTimeSeriesData = async () => {
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
        granularity,
      });

      const response = await fetch(`/api/analytics/timeseries?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch time series: ${response.statusText}`);
      }

      const timeSeriesData = await response.json();
      setData(timeSeriesData);
    } catch (err: any) {
      console.error("Error fetching time series:", err);
      setError(err.message || "Failed to load call volume data");
    } finally {
      setLoading(false);
    }
  };

  const totalCalls = data?.timeSeries.reduce((sum, point) => sum + point.totalCalls, 0) || 0;
  const peakAnalysis = data?.peakAnalysis;

  if (loading && !data) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800 animate-pulse">
        <div className="h-6 w-48 bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
        <p className="text-red-800 dark:text-red-200 font-semibold">Error loading call volume</p>
        <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Call Volume Analytics
        </h3>
        <div className="flex items-center space-x-2">
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as "day" | "hour" | "week" | "month")}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="hour">Hourly</option>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Chart placeholder - would use a charting library like recharts here */}
      <div className="h-64 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
        {data?.timeSeries && data.timeSeries.length > 0 ? (
          <div className="text-center">
            <div className="mb-4 text-4xl">📈</div>
            <p className="text-gray-600 dark:text-gray-300">
              {data.timeSeries.length} data points
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Max: {Math.max(...data.timeSeries.map(t => t.totalCalls))} calls
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-4 text-4xl">📈</div>
            <p className="text-gray-600 dark:text-gray-300">
              No data available
            </p>
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Calls</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalCalls.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
              <span className="text-green-600 dark:text-green-400">📞</span>
            </div>
          </div>
          {data?.growthMetrics.monthOverMonth !== null && (
            <p className={`mt-2 text-xs ${
              (data.growthMetrics.monthOverMonth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {(data.growthMetrics.monthOverMonth || 0) >= 0 ? '+' : ''}
              {data.growthMetrics.monthOverMonth?.toFixed(1)}% MoM
            </p>
          )}
        </div>
        
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Peak Hour</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {peakAnalysis?.busiestHourFormatted || "N/A"}
              </p>
            </div>
            <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900">
              <span className="text-orange-600 dark:text-orange-400">⏰</span>
            </div>
          </div>
          {peakAnalysis && (
            <p className="mt-2 text-xs text-orange-600">
              {peakAnalysis.busiestHourCount} calls during peak
            </p>
          )}
        </div>
      </div>

      {/* Growth Metrics */}
      {data?.growthMetrics && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {data.growthMetrics.monthOverMonth !== null && (
              <div>
                <p className="text-gray-500 dark:text-gray-400">Month over Month</p>
                <p className={`text-lg font-semibold ${
                  (data.growthMetrics.monthOverMonth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(data.growthMetrics.monthOverMonth || 0) >= 0 ? '+' : ''}
                  {data.growthMetrics.monthOverMonth?.toFixed(1)}%
                </p>
              </div>
            )}
            {data.growthMetrics.yearOverYear !== null && (
              <div>
                <p className="text-gray-500 dark:text-gray-400">Year over Year</p>
                <p className={`text-lg font-semibold ${
                  (data.growthMetrics.yearOverYear || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(data.growthMetrics.yearOverYear || 0) >= 0 ? '+' : ''}
                  {data.growthMetrics.yearOverYear?.toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
