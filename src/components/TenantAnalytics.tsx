"use client";

import React, { useState } from "react";
import { 
  ChartBarIcon,
  UsersIcon,
  PhoneIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from "@heroicons/react/24/outline";

export default function TenantAnalytics() {
  const [timeRange, setTimeRange] = useState("30d");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [analyticsData, setAnalyticsData] = useState({
    overview: {
      totalCalls: 15420,
      totalUsers: 1250,
      avgCallDuration: 4.5,
      satisfactionScore: 4.2,
      callTrend: 12.5,
      userTrend: 8.3,
      durationTrend: -2.1,
      satisfactionTrend: 5.7
    },
    callMetrics: {
      inbound: 12850,
      outbound: 2570,
      missed: 180,
      answered: 15240,
      abandoned: 180
    },
    userActivity: {
      activeUsers: 890,
      newUsers: 45,
      returningUsers: 845,
      avgSessionDuration: 12.3
    },
    performance: {
      avgResponseTime: 1.2,
      firstCallResolution: 78.5,
      escalationRate: 12.3,
      systemUptime: 99.9
    },
    topAgents: [
      { name: "Sarah Johnson", calls: 245, satisfaction: 4.8, resolution: 92 },
      { name: "Mike Chen", calls: 198, satisfaction: 4.6, resolution: 89 },
      { name: "Emily Davis", calls: 187, satisfaction: 4.7, resolution: 91 },
      { name: "David Wilson", calls: 156, satisfaction: 4.5, resolution: 87 }
    ],
    callVolume: [
      { date: "2024-01-15", calls: 520, satisfaction: 4.1 },
      { date: "2024-01-16", calls: 480, satisfaction: 4.3 },
      { date: "2024-01-17", calls: 610, satisfaction: 4.2 },
      { date: "2024-01-18", calls: 590, satisfaction: 4.4 },
      { date: "2024-01-19", calls: 650, satisfaction: 4.3 },
      { date: "2024-01-20", calls: 720, satisfaction: 4.5 },
      { date: "2024-01-21", calls: 680, satisfaction: 4.4 }
    ]
  });

  const getTrendIcon = (trend: number) => {
    return trend >= 0 ? (
      <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
    ) : (
      <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
    );
  };

  const getTrendColor = (trend: number) => {
    return trend >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Tenant Analytics
            </h3>
          </div>
          <div className="flex space-x-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <button className="inline-flex items-center justify-center gap-2.5 rounded-md bg-indigo-600 py-1.5 px-3 text-center font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800">
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Overview Metrics */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Overview
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                  <PhoneIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex items-center space-x-1">
                  {getTrendIcon(analyticsData.overview.callTrend)}
                  <span className={`text-sm font-medium ${getTrendColor(analyticsData.overview.callTrend)}`}>
                    {analyticsData.overview.callTrend > 0 ? '+' : ''}{analyticsData.overview.callTrend}%
                  </span>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analyticsData.overview.totalCalls.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Calls</p>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                  <UsersIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex items-center space-x-1">
                  {getTrendIcon(analyticsData.overview.userTrend)}
                  <span className={`text-sm font-medium ${getTrendColor(analyticsData.overview.userTrend)}`}>
                    {analyticsData.overview.userTrend > 0 ? '+' : ''}{analyticsData.overview.userTrend}%
                  </span>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analyticsData.overview.totalUsers.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
            </div>

            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                  <ClockIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex items-center space-x-1">
                  {getTrendIcon(analyticsData.overview.durationTrend)}
                  <span className={`text-sm font-medium ${getTrendColor(analyticsData.overview.durationTrend)}`}>
                    {analyticsData.overview.durationTrend > 0 ? '+' : ''}{analyticsData.overview.durationTrend}%
                  </span>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analyticsData.overview.avgCallDuration}m
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Duration</p>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg">
                  <ChartBarIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex items-center space-x-1">
                  {getTrendIcon(analyticsData.overview.satisfactionTrend)}
                  <span className={`text-sm font-medium ${getTrendColor(analyticsData.overview.satisfactionTrend)}`}>
                    {analyticsData.overview.satisfactionTrend > 0 ? '+' : ''}{analyticsData.overview.satisfactionTrend}%
                  </span>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analyticsData.overview.satisfactionScore}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Satisfaction</p>
            </div>
          </div>
        </div>

        {/* Call Metrics */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Call Distribution
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analyticsData.callMetrics.inbound.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Inbound</p>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analyticsData.callMetrics.outbound.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Outbound</p>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analyticsData.callMetrics.answered.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Answered</p>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analyticsData.callMetrics.missed.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Missed</p>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analyticsData.callMetrics.abandoned.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Abandoned</p>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Performance Metrics
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analyticsData.performance.avgResponseTime}s
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Response Time</p>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analyticsData.performance.firstCallResolution}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">First Call Resolution</p>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analyticsData.performance.escalationRate}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Escalation Rate</p>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analyticsData.performance.systemUptime}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">System Uptime</p>
            </div>
          </div>
        </div>

        {/* Top Performing Agents */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Top Performing Agents
          </h4>
          <div className="overflow-hidden border border-gray-200 dark:border-gray-600 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Calls
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Satisfaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Resolution Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                {analyticsData.topAgents.map((agent, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                              {agent.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {agent.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {agent.calls}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center">
                        <span className="mr-1">{agent.satisfaction}</span>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`w-4 h-4 ${i < Math.floor(agent.satisfaction) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {agent.resolution}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Call Volume Chart Placeholder */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Call Volume Trend
          </h4>
          <div className="p-6 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-center">
                <ChartBarIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Call volume chart would be displayed here
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Integration with charting library required
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
