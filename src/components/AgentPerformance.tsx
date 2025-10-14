"use client";

import React, { useState } from "react";
import { 
  UserGroupIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  EyeIcon
} from "@heroicons/react/24/outline";

interface AgentPerformance {
  id: string;
  name: string;
  avatar?: string;
  department: string;
  callsHandled: number;
  averageScore: number;
  customerSatisfaction: number;
  firstCallResolution: number;
  averageHandleTime: number;
  trend: "up" | "down" | "stable";
  lastActive: string;
  status: "online" | "offline" | "busy";
}

const mockAgentPerformance: AgentPerformance[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    department: "Customer Service",
    callsHandled: 127,
    averageScore: 94.2,
    customerSatisfaction: 4.7,
    firstCallResolution: 89.2,
    averageHandleTime: 3.1,
    trend: "up",
    lastActive: "2 minutes ago",
    status: "online"
  },
  {
    id: "2",
    name: "Mike Chen",
    department: "Technical Support",
    callsHandled: 98,
    averageScore: 91.5,
    customerSatisfaction: 4.5,
    firstCallResolution: 85.7,
    averageHandleTime: 4.2,
    trend: "up",
    lastActive: "5 minutes ago",
    status: "busy"
  },
  {
    id: "3",
    name: "Emily Davis",
    department: "Sales",
    callsHandled: 156,
    averageScore: 88.9,
    customerSatisfaction: 4.3,
    firstCallResolution: 82.1,
    averageHandleTime: 5.8,
    trend: "down",
    lastActive: "1 hour ago",
    status: "offline"
  },
  {
    id: "4",
    name: "David Wilson",
    department: "Customer Service",
    callsHandled: 89,
    averageScore: 92.8,
    customerSatisfaction: 4.6,
    firstCallResolution: 87.4,
    averageHandleTime: 3.5,
    trend: "stable",
    lastActive: "15 minutes ago",
    status: "online"
  },
  {
    id: "5",
    name: "Lisa Brown",
    department: "Billing",
    callsHandled: 112,
    averageScore: 90.1,
    customerSatisfaction: 4.4,
    firstCallResolution: 84.6,
    averageHandleTime: 4.1,
    trend: "up",
    lastActive: "30 minutes ago",
    status: "online"
  }
];

export default function AgentPerformance() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("averageScore");

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "busy":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "offline":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
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

  const sortedAgents = [...mockAgentPerformance].sort((a, b) => {
    switch (sortBy) {
      case "averageScore":
        return b.averageScore - a.averageScore;
      case "callsHandled":
        return b.callsHandled - a.callsHandled;
      case "customerSatisfaction":
        return b.customerSatisfaction - a.customerSatisfaction;
      case "firstCallResolution":
        return b.firstCallResolution - a.firstCallResolution;
      default:
        return 0;
    }
  });

  const topPerformer = sortedAgents[0];
  const averageScore = mockAgentPerformance.reduce((sum, agent) => sum + agent.averageScore, 0) / mockAgentPerformance.length;

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

      <div className="p-6">
        {/* Top Performer */}
        <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                {getInitials(topPerformer.name)}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {topPerformer.name}
                </h4>
                <StarIcon className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                  Top Performer
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {topPerformer.department} • {topPerformer.callsHandled} calls handled
              </p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${getScoreColor(topPerformer.averageScore)}`}>
                {topPerformer.averageScore}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Average Score</div>
            </div>
          </div>
        </div>

        {/* Agents List */}
        <div className="space-y-4">
          {sortedAgents.map((agent) => (
            <div
              key={agent.id}
              className={`p-4 border rounded-lg transition-all duration-200 ${
                selectedAgent === agent.id
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <div className="flex items-center space-x-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {getInitials(agent.name)}
                    </span>
                  </div>
                </div>

                {/* Agent Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {agent.name}
                    </h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                      {agent.status}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {agent.lastActive}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {agent.department}
                  </p>
                  
                  {/* Performance Metrics */}
                  <div className="grid grid-cols-4 gap-4 text-xs">
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Calls</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {agent.callsHandled}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Satisfaction</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {agent.customerSatisfaction}/5.0
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">FCR</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {agent.firstCallResolution}%
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">AHT</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {agent.averageHandleTime}min
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score and Trend */}
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getScoreColor(agent.averageScore)}`}>
                      {agent.averageScore}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Score</div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(agent.trend)}
                  </div>
                  <button
                    onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {selectedAgent === agent.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Performance Details
                  </h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Quality Score</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {agent.averageScore}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Customer Satisfaction</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {agent.customerSatisfaction}/5.0
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">First Call Resolution</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {agent.firstCallResolution}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Average Handle Time</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {agent.averageHandleTime} minutes
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {averageScore.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Team Average</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {mockAgentPerformance.filter(a => a.status === "online").length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Online Agents</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {mockAgentPerformance.reduce((sum, agent) => sum + agent.callsHandled, 0)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Calls</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}