"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  UserGroupIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { useOrganization } from "@/context/OrganizationContext";

interface AgentPerformance {
  agentId: string;
  agentName: string;
  agentType: string;
  isActive: boolean;
  metrics: {
    totalCalls: number;
    completedCalls: number;
    failedCalls: number;
    inProgressCalls: number;
    avgHandleTime: number;
    avgHandleTimeFormatted: string;
    firstCallResolution: number;
    answerRate: number;
    customerSatisfaction: number | null;
    averageScore: number;
  };
  trainingNeeds: string[];
  trend: "up" | "down" | "stable";
}

interface AgentAnalyticsData {
  agents: AgentPerformance[];
  summary: {
    totalAgents: number;
    totalCalls: number;
    averageScore: number;
    averageHandleTime: number;
    averageFirstCallResolution: number;
  } | null;
  rankings: {
    topPerformers: AgentPerformance[];
    bottomPerformers: AgentPerformance[];
  };
  utilization: {
    agents: Array<{
      agentId: string;
      agentName: string;
      activeTime: number;
      idleTime: number;
      utilizationRate: number;
      efficiency: number;
    }>;
    averageUtilization: number;
  };
  period: {
    start_date: string;
    end_date: string;
  };
}

export default function AgentPerformanceList() {
  const { currentOrganization } = useOrganization();
  const router = useRouter();
  const [data, setData] = useState<AgentAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("averageScore");
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchAgentPerformance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization?.id, days]);

  const fetchAgentPerformance = async () => {
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

      const response = await fetch(`/api/analytics/agents?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch agent performance: ${response.statusText}`);
      }

      const agentData = await response.json();
      setData(agentData);
    } catch (err: any) {
      console.error("Error fetching agent performance:", err);
      setError(err.message || "Failed to load agent performance");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 3);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />;
      case "down":
        return <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />;
      default:
        return <MinusIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 80) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const handleAgentClick = (agentId: string) => {
    router.push(`/analytics/agents/${agentId}`);
  };

  if (loading && !data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
        <div className="p-6">
          <div className="h-6 w-48 bg-gray-300 dark:bg-gray-700 rounded mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-red-200 dark:border-red-800 p-6">
        <p className="text-red-800 dark:text-red-200 font-semibold">Error loading agent performance</p>
        <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
        <button
          onClick={fetchAgentPerformance}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || !data.agents || data.agents.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-gray-600 dark:text-gray-400">No agent performance data available</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Agents need to handle calls to see performance metrics
        </p>
      </div>
    );
  }

  const sortedAgents = [...data.agents].sort((a, b) => {
    switch (sortBy) {
      case "averageScore":
        return (b.metrics.averageScore || 0) - (a.metrics.averageScore || 0);
      case "callsHandled":
        return b.metrics.totalCalls - a.metrics.totalCalls;
      case "customerSatisfaction":
        return (b.metrics.customerSatisfaction || 0) - (a.metrics.customerSatisfaction || 0);
      case "firstCallResolution":
        return b.metrics.firstCallResolution - a.metrics.firstCallResolution;
      default:
        return 0;
    }
  });

  const topPerformer = sortedAgents[0];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserGroupIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Agent Performance
            </h3>
          </div>
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
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="averageScore">Sort by Score</option>
              <option value="callsHandled">Sort by Calls</option>
              <option value="customerSatisfaction">Sort by Satisfaction</option>
              <option value="firstCallResolution">Sort by FCR</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Top Performer */}
        {topPerformer && (
          <div 
            className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleAgentClick(topPerformer.agentId)}
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {getInitials(topPerformer.agentName)}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {topPerformer.agentName}
                  </h4>
                  <StarIcon className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                    Top Performer
                  </span>
                  <span className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded">
                    {topPerformer.agentType}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {topPerformer.metrics.totalCalls} calls handled
                </p>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${getScoreColor(topPerformer.metrics.averageScore || 0)}`}>
                  {topPerformer.metrics.averageScore?.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Average Score</div>
              </div>
              <ArrowRightIcon className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        )}

        {/* Agents List */}
        <div className="space-y-4">
          {sortedAgents.map((agent) => (
            <div
              key={agent.agentId}
              className="p-4 border rounded-lg transition-all duration-200 cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-gray-200 dark:border-gray-700"
              onClick={() => handleAgentClick(agent.agentId)}
            >
              <div className="flex items-center space-x-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {getInitials(agent.agentName)}
                    </span>
                  </div>
                </div>

                {/* Agent Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {agent.agentName}
                    </h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      agent.isActive 
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                    }`}>
                      {agent.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                      {agent.agentType}
                    </span>
                  </div>
                  
                  {/* Performance Metrics */}
                  <div className="grid grid-cols-4 gap-4 text-xs">
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Calls</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {agent.metrics.totalCalls}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Satisfaction</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {agent.metrics.customerSatisfaction !== null 
                          ? `${agent.metrics.customerSatisfaction.toFixed(1)}/5.0`
                          : "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">FCR</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {agent.metrics.firstCallResolution.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">AHT</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {agent.metrics.avgHandleTimeFormatted || `${agent.metrics.avgHandleTime.toFixed(1)}m`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score and Trend */}
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getScoreColor(agent.metrics.averageScore || 0)}`}>
                      {agent.metrics.averageScore?.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Score</div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(agent.trend)}
                  </div>
                  <ArrowRightIcon className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        {data.summary && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {data.summary.averageScore.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Team Average Score</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {data.summary.totalAgents}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total Agents</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {data.summary.totalCalls.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total Calls</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

