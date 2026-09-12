"use client";

import React, { useState, useEffect } from "react";
import { useOrganization } from "@/context/OrganizationContext";
import { ArrowTrendingUpIcon } from "@heroicons/react/24/outline";

interface CustomerExperienceData {
  satisfactionTrends: Array<{
    date: string;
    average: number;
    count: number;
  }>;
  sentimentAnalysis: {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
    average: number;
    distribution: {
      positive: number;
      neutral: number;
      negative: number;
    };
  };
  resolutionRate: {
    rate: number;
    resolved: number;
    total: number;
  };
  escalationPatterns: {
    total: number;
    rate: number;
    byReason: Record<string, number>;
  };
  customerJourney: {
    singleCallResolution: number;
    multiCallResolution: number;
    totalCustomers: number;
    averageCallsPerCustomer: number;
    singleCallRate: number;
  };
  period: {
    start_date: string;
    end_date: string;
  };
}

export default function CustomerExperienceMetrics() {
  const { currentOrganization } = useOrganization();
  const [data, setData] = useState<CustomerExperienceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchCustomerExperience();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization?.id, days]);

  const fetchCustomerExperience = async () => {
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

      const response = await fetch(`/api/analytics/customer-experience?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch customer experience: ${response.statusText}`);
      }

      const experienceData = await response.json();
      setData(experienceData);
    } catch (err: any) {
      console.error("Error fetching customer experience:", err);
      setError(err.message || "Failed to load customer experience data");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800 animate-pulse">
        <div className="h-6 w-64 bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
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
        <p className="text-red-800 dark:text-red-200 font-semibold">Error loading customer experience</p>
        <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
        <button
          onClick={fetchCustomerExperience}
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

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Customer Experience Metrics
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

      {/* Customer Satisfaction Trends */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Customer Satisfaction Trends
        </h4>
        {data.satisfactionTrends && data.satisfactionTrends.length > 0 ? (
          <div className="h-48 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
            <div className="text-center">
              <ArrowTrendingUpIcon className="w-8 h-8 mx-auto mb-2 text-gray-500 dark:text-gray-400" />
              <p className="text-gray-600 dark:text-gray-300">
                {data.satisfactionTrends.length} data points
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Avg: {data.satisfactionTrends.length > 0 
                  ? (data.satisfactionTrends.reduce((sum, t) => sum + t.average, 0) / data.satisfactionTrends.length).toFixed(2)
                  : "0"
                }/5.0
              </p>
            </div>
          </div>
        ) : (
          <div className="h-48 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">No satisfaction data available</p>
          </div>
        )}
      </div>

      {/* Sentiment Analysis */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Sentiment Analysis
        </h4>
        {data.sentimentAnalysis.total > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Positive</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {data.sentimentAnalysis.positive}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {data.sentimentAnalysis.distribution.positive.toFixed(1)}%
              </p>
            </div>
            
            <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Neutral</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {data.sentimentAnalysis.neutral}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {data.sentimentAnalysis.distribution.neutral.toFixed(1)}%
              </p>
            </div>
            
            <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Negative</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {data.sentimentAnalysis.negative}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {data.sentimentAnalysis.distribution.negative.toFixed(1)}%
              </p>
            </div>
            
            <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg Sentiment</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {data.sentimentAnalysis.average >= 0 ? '+' : ''}{data.sentimentAnalysis.average.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {data.sentimentAnalysis.total} analyzed
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">No sentiment data available</p>
          </div>
        )}
      </div>

      {/* Resolution & Escalation Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-4 border border-emerald-200 dark:border-emerald-800">
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            First Call Resolution Rate
          </h5>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {data.resolutionRate.rate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {data.resolutionRate.resolved} of {data.resolutionRate.total} calls resolved
          </p>
        </div>

        <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 p-4 border border-orange-200 dark:border-orange-800">
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Escalation Rate
          </h5>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {data.escalationPatterns.rate.toFixed(2)}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {data.escalationPatterns.total} escalations
          </p>
        </div>
      </div>

      {/* Escalation Reasons */}
      {data.escalationPatterns.byReason && Object.keys(data.escalationPatterns.byReason).length > 0 && (
        <div className="mb-6">
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Escalation Reasons
          </h5>
          <div className="space-y-2">
            {Object.entries(data.escalationPatterns.byReason)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 5)
              .map(([reason, count]) => (
                <div key={reason} className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-900">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{reason}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {count as number}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Customer Journey */}
      <div>
        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Customer Journey Analytics
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Single Call</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {data.customerJourney.singleCallResolution}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {data.customerJourney.singleCallRate.toFixed(1)}% of customers
            </p>
          </div>
          
          <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Multi Call</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {data.customerJourney.multiCallResolution}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">resolutions</p>
          </div>
          
          <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Customers</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {data.customerJourney.totalCustomers}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">unique customers</p>
          </div>
          
          <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg Calls/Customer</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {data.customerJourney.averageCallsPerCustomer.toFixed(1)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">calls per customer</p>
          </div>
        </div>
      </div>
    </div>
  );
}

