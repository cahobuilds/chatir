"use client";

import React from "react";

interface Agent {
  id: string;
  name: string;
  status: "available" | "busy" | "offline" | "maintenance";
  callsHandled: number;
  avgResponseTime: string;
  lastSeen: string;
}

const agents: Agent[] = [
  {
    id: "agent-1",
    name: "AI Agent Alpha",
    status: "available",
    callsHandled: 156,
    avgResponseTime: "1.2s",
    lastSeen: "Now"
  },
  {
    id: "agent-2", 
    name: "AI Agent Beta",
    status: "busy",
    callsHandled: 142,
    avgResponseTime: "1.4s",
    lastSeen: "2m ago"
  },
  {
    id: "agent-3",
    name: "AI Agent Gamma",
    status: "available",
    callsHandled: 98,
    avgResponseTime: "1.1s",
    lastSeen: "Now"
  },
  {
    id: "agent-4",
    name: "AI Agent Delta",
    status: "maintenance",
    callsHandled: 203,
    avgResponseTime: "1.3s",
    lastSeen: "1h ago"
  }
];

export default function AgentAvailability() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-green-500";
      case "busy": return "bg-yellow-500";
      case "offline": return "bg-gray-500";
      case "maintenance": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "available": return "Available";
      case "busy": return "On Call";
      case "offline": return "Offline";
      case "maintenance": return "Maintenance";
      default: return "Unknown";
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Agent Availability
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {agents.filter(a => a.status === 'available').length}/{agents.length} Available
        </span>
      </div>

      <div className="space-y-3">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex items-center space-x-3">
              <div className={`h-3 w-3 rounded-full ${getStatusColor(agent.status)}`}></div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {agent.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {agent.callsHandled} calls • {agent.avgResponseTime} avg
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {getStatusText(agent.status)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {agent.lastSeen}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-center">
        <button className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
          Manage Agents
        </button>
      </div>
    </div>
  );
}
