"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  UserGroupIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  ArrowLeftIcon,
  ClockIcon,
  PhoneIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { useOrganization } from "@/context/OrganizationContext";
import Link from "next/link";

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

interface AgentPerformanceDetailProps {
  agentId: string;
}

export default function AgentPerformanceDetail({ agentId }: AgentPerformanceDetailProps) {
  const { currentOrganization } = useOrganization();
  const router = useRouter();
  const [data, setData] = useState<AgentAnalyticsData | null>(null);
  const [agent, setAgent] = useState<AgentPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchAgentPerformance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization?.id, days, agentId]);

  const fetchAgentPerformance = async () => {
    if (!currentOrganization?.id || !agentId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        tenant_id: currentOrganization.id,
        agent_id: agentId,
        days: days.toString(),
      });

      const response = await fetch(`/api/analytics/agents?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch agent performance: ${response.statusText}`);
      }

      const agentData = await response.json();
      setData(agentData);
      
      // Find the specific agent
      const foundAgent = agentData.agents?.find((a: AgentPerformance) => a.agentId === agentId);
      setAgent(foundAgent || null);
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

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20";
    if (score >= 80) return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20";
    return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20";
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />;
      case "down":
        return <ArrowTrendingDownIcon className="w-5 h-5 text-red-500" />;
      default:
        return <MinusIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading && !agent) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
        <div className="p-6">
          <div className="h-8 w-64 bg-gray-300 dark:bg-gray-700 rounded mb-6"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error && !agent) {
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

  if (!agent) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-gray-600 dark:text-gray-400">Agent not found</p>
        <Link
          href="/analytics/agents"
          className="mt-3 inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Agent List
        </Link>
      </div>
    );
  }

  const utilization = data?.utilization?.agents.find(u => u.agentId === agentId);
  const isTopPerformer = data?.rankings?.topPerformers.some(tp => tp.agentId === agentId);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/analytics/agents"
        className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      >
        <ArrowLeftIcon className="w-4 h-4 mr-2" />
        Back to Agent List
      </Link>

      {/* Agent Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <span className="text-xl font-bold text-gray-600 dark:text-gray-400">
              {getInitials(agent.agentName)}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {agent.agentName}
              </h2>
              {isTopPerformer && (
                <>
                  <StarIcon className="w-6 h-6 text-yellow-500" />
                  <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                    Top Performer
                  </span>
                </>
              )}
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                agent.isActive 
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
              }`}>
                {agent.isActive ? "Active" : "Inactive"}
              </span>
              <span className="text-sm px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                {agent.agentType}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              {agent.metrics.totalCalls} calls handled • {agent.metrics.completedCalls} completed
            </p>
          </div>
          <div className={`text-right px-6 py-4 rounded-lg ${getScoreColor(agent.metrics.averageScore || 0)}`}>
            <div className="text-4xl font-bold">
              {agent.metrics.averageScore?.toFixed(1)}%
            </div>
            <div className="text-sm font-medium">Average Score</div>
            <div className="flex items-center justify-end mt-2">
              {getTrendIcon(agent.trend)}
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <PhoneIcon className="w-5 h-5 text-blue-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Total</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {agent.metrics.totalCalls}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Calls Handled</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Rate</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {agent.metrics.answerRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Answer Rate</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <ClockIcon className="w-5 h-5 text-purple-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Average</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {agent.metrics.avgHandleTimeFormatted || `${agent.metrics.avgHandleTime.toFixed(1)}m`}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Handle Time</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <StarIcon className="w-5 h-5 text-yellow-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Rate</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {agent.metrics.firstCallResolution.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">First Call Resolution</div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Performance Breakdown
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Completed Calls</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {agent.metrics.completedCalls}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Failed Calls</span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {agent.metrics.failedCalls}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">In Progress</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {agent.metrics.inProgressCalls}
              </span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Customer Satisfaction</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {agent.metrics.customerSatisfaction !== null
                  ? `${agent.metrics.customerSatisfaction.toFixed(1)}/5.0`
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Utilization & Efficiency */}
        {utilization && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Utilization & Efficiency
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Utilization Rate</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {utilization.utilizationRate.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{ width: `${Math.min(utilization.utilizationRate, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Active Time</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {Math.round(utilization.activeTime / 60)}h {utilization.activeTime % 60}m
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Idle Time</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {Math.round(utilization.idleTime / 60)}h {utilization.idleTime % 60}m
                </span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Efficiency Score</span>
                <span className={`font-semibold ${
                  utilization.efficiency >= 90 ? 'text-green-600 dark:text-green-400' :
                  utilization.efficiency >= 80 ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-red-600 dark:text-red-400'
                }`}>
                  {utilization.efficiency.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Training Needs */}
        {agent.trainingNeeds && agent.trainingNeeds.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-yellow-200 dark:border-yellow-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Training Needs
            </h3>
            <div className="flex flex-wrap gap-2">
              {agent.trainingNeeds.map((need, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 text-sm bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded-full"
                >
                  {need}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Period Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Time Period
          </h3>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          {data?.period && (
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              <p>From: {new Date(data.period.start_date).toLocaleDateString()}</p>
              <p>To: {new Date(data.period.end_date).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Comparison with Team Average */}
      {data?.summary && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Comparison with Team Average
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Average Score</div>
              <div className="flex items-center space-x-2">
                <div className={`text-2xl font-bold ${
                  (agent.metrics.averageScore || 0) >= (data.summary.averageScore || 0)
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {agent.metrics.averageScore?.toFixed(1)}%
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  vs {data.summary.averageScore.toFixed(1)}% avg
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Handle Time</div>
              <div className="flex items-center space-x-2">
                <div className={`text-2xl font-bold ${
                  agent.metrics.avgHandleTime <= (data.summary.averageHandleTime || 0)
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {agent.metrics.avgHandleTime.toFixed(1)}m
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  vs {data.summary.averageHandleTime.toFixed(1)}m avg
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">First Call Resolution</div>
              <div className="flex items-center space-x-2">
                <div className={`text-2xl font-bold ${
                  agent.metrics.firstCallResolution >= (data.summary.averageFirstCallResolution || 0)
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {agent.metrics.firstCallResolution.toFixed(1)}%
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  vs {data.summary.averageFirstCallResolution.toFixed(1)}% avg
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

