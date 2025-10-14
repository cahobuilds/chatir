"use client";

import React, { useState } from "react";
import { 
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon
} from "@heroicons/react/24/outline";

interface Agent {
  id: string;
  name: string;
  type: "voice" | "chat";
  status: "online" | "busy" | "offline" | "training";
  currentCalls: number;
  maxCalls: number;
  avgResponseTime: string;
  satisfaction: number;
  lastActive: string;
  uptime: string;
}

const mockAgents: Agent[] = [
  {
    id: "1",
    name: "AI Agent Alpha",
    type: "voice",
    status: "online",
    currentCalls: 3,
    maxCalls: 5,
    avgResponseTime: "2.3s",
    satisfaction: 4.2,
    lastActive: "1 minute ago",
    uptime: "99.8%"
  },
  {
    id: "2",
    name: "AI Agent Beta",
    type: "voice",
    status: "busy",
    currentCalls: 5,
    maxCalls: 5,
    avgResponseTime: "3.1s",
    satisfaction: 4.5,
    lastActive: "30 seconds ago",
    uptime: "99.5%"
  },
  {
    id: "3",
    name: "Chat Agent Gamma",
    type: "chat",
    status: "online",
    currentCalls: 8,
    maxCalls: 10,
    avgResponseTime: "1.8s",
    satisfaction: 4.1,
    lastActive: "2 minutes ago",
    uptime: "99.9%"
  },
  {
    id: "4",
    name: "AI Agent Delta",
    type: "voice",
    status: "training",
    currentCalls: 0,
    maxCalls: 5,
    avgResponseTime: "N/A",
    satisfaction: 0,
    lastActive: "1 hour ago",
    uptime: "98.2%"
  },
  {
    id: "5",
    name: "Chat Agent Epsilon",
    type: "chat",
    status: "offline",
    currentCalls: 0,
    maxCalls: 10,
    avgResponseTime: "N/A",
    satisfaction: 0,
    lastActive: "3 hours ago",
    uptime: "95.1%"
  }
];

export default function AgentStatusOverview() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [filter, setFilter] = useState<"all" | "voice" | "chat">("all");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "busy":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "offline":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      case "training":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case "busy":
        return <ExclamationCircleIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      case "offline":
        return <XCircleIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
      case "training":
        return <ClockIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <XCircleIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === "voice" 
      ? <UserGroupIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
      : <ChatBubbleLeftRightIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />;
  };

  const filteredAgents = filter === "all" 
    ? agents 
    : agents.filter(agent => agent.type === filter);

  const getCapacityColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return "text-red-600 dark:text-red-400";
    if (percentage >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserGroupIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Agent Status
            </h3>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => setFilter("all")}
              className={`px-2 py-1 text-xs font-medium rounded ${
                filter === "all"
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("voice")}
              className={`px-2 py-1 text-xs font-medium rounded ${
                filter === "voice"
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
              }`}
            >
              Voice
            </button>
            <button
              onClick={() => setFilter("chat")}
              className={`px-2 py-1 text-xs font-medium rounded ${
                filter === "chat"
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
              }`}
            >
              Chat
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {filteredAgents.map((agent) => (
            <div
              key={agent.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {getTypeIcon(agent.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {agent.name}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                        {agent.status}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                      <div className="flex items-center justify-between">
                        <span>Capacity:</span>
                        <span className={`font-medium ${getCapacityColor(agent.currentCalls, agent.maxCalls)}`}>
                          {agent.currentCalls}/{agent.maxCalls}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Response Time:</span>
                        <span className="font-medium">{agent.avgResponseTime}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Satisfaction:</span>
                        <span className="font-medium">
                          {agent.satisfaction > 0 ? `${agent.satisfaction}/5` : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Uptime:</span>
                        <span className="font-medium">{agent.uptime}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Last Active:</span>
                        <span className="font-medium">{agent.lastActive}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex-shrink-0">
                  {getStatusIcon(agent.status)}
                </div>
              </div>

              {/* Capacity Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                  <span>Capacity Usage</span>
                  <span>{Math.round((agent.currentCalls / agent.maxCalls) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      (agent.currentCalls / agent.maxCalls) >= 0.9
                        ? "bg-red-500"
                        : (agent.currentCalls / agent.maxCalls) >= 0.7
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${(agent.currentCalls / agent.maxCalls) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredAgents.length === 0 && (
          <div className="text-center py-8">
            <UserGroupIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No agents found for the selected filter.
            </p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {agents.filter(agent => agent.status === "online").length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Online</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {agents.filter(agent => agent.status === "busy").length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Busy</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
