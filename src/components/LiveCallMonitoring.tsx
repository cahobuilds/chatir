"use client";

import React from "react";

interface ActiveCall {
  id: string;
  caller: string;
  agent: string;
  duration: string;
  status: "active" | "on-hold" | "transferring";
  sentiment: "positive" | "neutral" | "negative";
  language: string;
}

const activeCalls: ActiveCall[] = [
  {
    id: "CALL-001",
    caller: "+1 (555) 123-4567",
    agent: "AI Agent Alpha",
    duration: "2m 34s",
    status: "active",
    sentiment: "positive",
    language: "EN"
  },
  {
    id: "CALL-002", 
    caller: "+1 (555) 987-6543",
    agent: "AI Agent Beta",
    duration: "1m 12s",
    status: "on-hold",
    sentiment: "neutral",
    language: "EN"
  },
  {
    id: "CALL-003",
    caller: "+1 (555) 456-7890",
    agent: "AI Agent Gamma",
    duration: "4m 56s",
    status: "transferring",
    sentiment: "negative",
    language: "ES"
  }
];

export default function LiveCallMonitoring() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "on-hold": return "bg-yellow-500";
      case "transferring": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "text-green-600";
      case "neutral": return "text-yellow-600";
      case "negative": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Live Call Monitoring
        </h3>
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {activeCalls.length} Active
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {activeCalls.map((call) => (
          <div
            key={call.id}
            className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`h-3 w-3 rounded-full ${getStatusColor(call.status)}`}></div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {call.caller}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {call.agent} • {call.duration}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className={`text-sm font-medium ${getSentimentColor(call.sentiment)}`}>
                    {call.sentiment}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {call.language}
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <button className="rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600">
                    Listen
                  </button>
                  <button className="rounded bg-gray-500 px-3 py-1 text-xs text-white hover:bg-gray-600">
                    Transfer
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <button className="rounded-lg bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700">
          View All Active Calls
        </button>
      </div>
    </div>
  );
}
