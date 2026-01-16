"use client";

import React, { useState, useEffect } from "react";
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

interface Analytics {
  duration: number | null;
  status: string;
  startedAt: string;
  endedAt: string | null;
  type: string;
  responseTime: number | null;
  talkTime: number | null;
  holdTime: number | null;
  silenceTime: number | null;
  quality: {
    score: number | null;
    sentiment: string | null;
    sentimentScore: number | null;
    summary: string | null;
  };
  performance: {
    firstResponseTime: number | null;
    averageResponseTime: number | null;
    resolutionRate: number | null;
  };
  cost: {
    total: number | null;
    perMinute: number | null;
    currency: string;
  };
  messageCount?: {
    total: number;
    agent: number;
    user: number;
  };
  retellData?: any;
}

interface CallAnalyticsProps {
  interactionId: string;
}

export default function CallAnalytics({ interactionId }: CallAnalyticsProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/interactions/${interactionId}/analytics`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }

        const data = await response.json();
        setAnalytics(data.analytics);
      } catch (err: any) {
        console.error("Error fetching analytics:", err);
        setError(err.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    if (interactionId) {
      fetchAnalytics();
    }
  }, [interactionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 dark:text-red-400 mb-2">{error}</div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Analytics data may not be available yet
        </p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <ChartBarIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          No analytics data available for this call
        </p>
      </div>
    );
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "N/A";
    if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
    return `${seconds.toFixed(1)}s`;
  };

  const getSentimentColor = (sentiment: string | null) => {
    if (!sentiment) return "text-gray-500";
    const lower = sentiment.toLowerCase();
    if (lower.includes('positive')) return "text-green-600";
    if (lower.includes('negative')) return "text-red-600";
    return "text-yellow-600";
  };

  const getQualityScoreColor = (score: number | null) => {
    if (!score) return "text-gray-500";
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <ClockIcon className="w-5 h-5 text-gray-400" />
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              analytics.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
              analytics.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
            }`}>
              {analytics.status}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatDuration(analytics.duration)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Duration</p>
        </div>

        {analytics.talkTime && (
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatDuration(analytics.talkTime)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Talk Time</p>
            {analytics.silenceTime && analytics.silenceTime > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatDuration(analytics.silenceTime)} silence
              </p>
            )}
          </div>
        )}

        {analytics.quality.score !== null && (
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <ChartBarIcon className="w-5 h-5 text-gray-400" />
            </div>
            <p className={`text-2xl font-bold ${getQualityScoreColor(analytics.quality.score)}`}>
              {analytics.quality.score.toFixed(0)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Quality Score</p>
          </div>
        )}

        {analytics.cost && analytics.cost.total !== null && typeof analytics.cost.total === 'number' && (
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <CurrencyDollarIcon className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${analytics.cost.total.toFixed(4)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Cost</p>
            {analytics.cost.perMinute && typeof analytics.cost.perMinute === 'number' && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ${analytics.cost.perMinute.toFixed(4)}/min
              </p>
            )}
          </div>
        )}
      </div>

      {/* Performance Metrics */}
      {(analytics.performance.firstResponseTime !== null || 
        analytics.performance.averageResponseTime !== null || 
        analytics.performance.resolutionRate !== null) && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Performance Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analytics.performance.firstResponseTime !== null && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  First Response Time
                </p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {formatTime(analytics.performance.firstResponseTime)}
                </p>
              </div>
            )}
            
            {analytics.performance.averageResponseTime !== null && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Average Response Time
                </p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {formatTime(analytics.performance.averageResponseTime)}
                </p>
              </div>
            )}
            
            {analytics.performance.resolutionRate !== null && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Resolution Rate
                </p>
                <p className={`text-xl font-semibold ${
                  analytics.performance.resolutionRate === 100 ? 'text-green-600' :
                  analytics.performance.resolutionRate === 0 ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {analytics.performance.resolutionRate}%
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quality & Sentiment */}
      {(analytics.quality.sentiment || analytics.quality.summary) && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Call Quality & Sentiment
          </h3>
          <div className="space-y-4">
            {analytics.quality.sentiment && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Sentiment
                </p>
                <div className="flex items-center space-x-2">
                  <p className={`text-lg font-semibold ${getSentimentColor(analytics.quality.sentiment)}`}>
                    {analytics.quality.sentiment}
                  </p>
                  {analytics.quality.sentimentScore !== null && (
                    <span className="text-sm text-gray-500">
                      ({analytics.quality.sentimentScore.toFixed(2)})
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {analytics.quality.summary && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Summary
                </p>
                <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                  {analytics.quality.summary}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Message Count (for chat interactions) */}
      {analytics.messageCount && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Message Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Messages</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {analytics.messageCount.total}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Agent Messages</p>
              <p className="text-xl font-semibold text-indigo-600">
                {analytics.messageCount.agent}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">User Messages</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {analytics.messageCount.user}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Additional Details */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Additional Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600 dark:text-gray-400">Started</p>
            <p className="text-gray-900 dark:text-white font-medium">
              {new Date(analytics.startedAt).toLocaleString()}
            </p>
          </div>
          {analytics.endedAt && (
            <div>
              <p className="text-gray-600 dark:text-gray-400">Ended</p>
              <p className="text-gray-900 dark:text-white font-medium">
                {new Date(analytics.endedAt).toLocaleString()}
              </p>
            </div>
          )}
          <div>
            <p className="text-gray-600 dark:text-gray-400">Type</p>
            <p className="text-gray-900 dark:text-white font-medium capitalize">
              {analytics.type}
            </p>
          </div>
          {analytics.retellData?.endReason && (
            <div>
              <p className="text-gray-600 dark:text-gray-400">End Reason</p>
              <p className="text-gray-900 dark:text-white font-medium capitalize">
                {analytics.retellData.endReason.replace(/_/g, ' ')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
