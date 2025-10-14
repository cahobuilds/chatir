"use client";

import React from "react";

interface VoiceAgent {
  id: string;
  name: string;
  status: "active" | "inactive" | "maintenance";
  voice: string;
  language: string;
  callsHandled: number;
  avgRating: number;
  lastUpdated: string;
  version: string;
}

const voiceAgents: VoiceAgent[] = [
  {
    id: "agent-1",
    name: "AI Agent Alpha",
    status: "active",
    voice: "Sarah (Neural)",
    language: "English (US)",
    callsHandled: 1247,
    avgRating: 4.8,
    lastUpdated: "2 hours ago",
    version: "v2.1.3"
  },
  {
    id: "agent-2",
    name: "AI Agent Beta",
    status: "active",
    voice: "Marcus (Neural)",
    language: "English (UK)",
    callsHandled: 892,
    avgRating: 4.6,
    lastUpdated: "1 hour ago",
    version: "v2.1.2"
  },
  {
    id: "agent-3",
    name: "AI Agent Gamma",
    status: "maintenance",
    voice: "Elena (Neural)",
    language: "Spanish",
    callsHandled: 634,
    avgRating: 4.7,
    lastUpdated: "3 hours ago",
    version: "v2.0.8"
  },
  {
    id: "agent-4",
    name: "AI Agent Delta",
    status: "inactive",
    voice: "David (Standard)",
    language: "French",
    callsHandled: 156,
    avgRating: 4.2,
    lastUpdated: "1 day ago",
    version: "v1.9.5"
  }
];

export default function VoiceAgentList() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "inactive": return "bg-gray-500";
      case "maintenance": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active": return "Active";
      case "inactive": return "Inactive";
      case "maintenance": return "Maintenance";
      default: return "Unknown";
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Voice Agents
        </h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Filter:</span>
            <select className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
              <option>All Status</option>
              <option>Active</option>
              <option>Inactive</option>
              <option>Maintenance</option>
            </select>
          </div>
          <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
            Bulk Actions
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="pb-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                Agent
              </th>
              <th className="pb-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                Voice & Language
              </th>
              <th className="pb-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                Performance
              </th>
              <th className="pb-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th className="pb-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                Version
              </th>
              <th className="pb-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {voiceAgents.map((agent) => (
              <tr key={agent.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                <td className="py-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {agent.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      ID: {agent.id}
                    </p>
                  </div>
                </td>
                <td className="py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {agent.voice}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {agent.language}
                    </p>
                  </div>
                </td>
                <td className="py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {agent.callsHandled.toLocaleString()} calls
                    </p>
                    <div className="flex items-center space-x-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ⭐ {agent.avgRating}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-4">
                  <div className="flex items-center space-x-2">
                    <div className={`h-2 w-2 rounded-full ${getStatusColor(agent.status)}`}></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {getStatusText(agent.status)}
                    </span>
                  </div>
                </td>
                <td className="py-4">
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                    {agent.version}
                  </span>
                </td>
                <td className="py-4">
                  <div className="flex items-center space-x-2">
                    <button className="rounded bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700">
                      Edit
                    </button>
                    <button className="rounded bg-gray-500 px-3 py-1 text-xs text-white hover:bg-gray-600">
                      Test
                    </button>
                    <button className="rounded bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing {voiceAgents.length} agents
        </p>
        <div className="flex items-center space-x-2">
          <button className="rounded bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
            Previous
          </button>
          <button className="rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700">
            1
          </button>
          <button className="rounded bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
            2
          </button>
          <button className="rounded bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
