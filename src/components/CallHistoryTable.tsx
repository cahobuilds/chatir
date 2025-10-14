"use client";

import React, { useState } from "react";

interface CallRecord {
  id: string;
  timestamp: string;
  caller: string;
  direction: "inbound" | "outbound";
  duration: string;
  agent: string;
  status: "completed" | "missed" | "failed" | "busy";
  sentiment: "positive" | "neutral" | "negative";
  hasRecording: boolean;
  hasTranscript: boolean;
  transferred: boolean;
  language: string;
  outcome: string;
}

const callRecords: CallRecord[] = [
  {
    id: "CALL-2024-001",
    timestamp: "2024-01-15 14:23:45",
    caller: "+1 (555) 123-4567",
    direction: "inbound",
    duration: "3m 24s",
    agent: "AI Agent Alpha",
    status: "completed",
    sentiment: "positive",
    hasRecording: true,
    hasTranscript: true,
    transferred: false,
    language: "EN",
    outcome: "Issue Resolved"
  },
  {
    id: "CALL-2024-002",
    timestamp: "2024-01-15 14:18:12",
    caller: "+1 (555) 987-6543",
    direction: "inbound",
    duration: "1m 45s",
    agent: "AI Agent Beta",
    status: "completed",
    sentiment: "neutral",
    hasRecording: true,
    hasTranscript: true,
    transferred: true,
    language: "EN",
    outcome: "Transferred to Human"
  },
  {
    id: "CALL-2024-003",
    timestamp: "2024-01-15 14:12:33",
    caller: "+1 (555) 456-7890",
    direction: "inbound",
    duration: "0m 0s",
    agent: "AI Agent Gamma",
    status: "missed",
    sentiment: "neutral",
    hasRecording: false,
    hasTranscript: false,
    transferred: false,
    language: "ES",
    outcome: "No Answer"
  },
  {
    id: "CALL-2024-004",
    timestamp: "2024-01-15 14:05:21",
    caller: "+1 (555) 321-0987",
    direction: "inbound",
    duration: "2m 18s",
    agent: "AI Agent Alpha",
    status: "completed",
    sentiment: "negative",
    hasRecording: true,
    hasTranscript: true,
    transferred: false,
    language: "EN",
    outcome: "Escalated"
  },
  {
    id: "CALL-2024-005",
    timestamp: "2024-01-15 13:58:07",
    caller: "+1 (555) 654-3210",
    direction: "inbound",
    duration: "4m 12s",
    agent: "AI Agent Delta",
    status: "completed",
    sentiment: "positive",
    hasRecording: true,
    hasTranscript: true,
    transferred: false,
    language: "FR",
    outcome: "Issue Resolved"
  }
];

export default function CallHistoryTable() {
  const [selectedCall, setSelectedCall] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "missed": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "failed": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      case "busy": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "text-green-600 dark:text-green-400";
      case "neutral": return "text-yellow-600 dark:text-yellow-400";
      case "negative": return "text-red-600 dark:text-red-400";
      default: return "text-gray-600 dark:text-gray-400";
    }
  };

  const getDirectionIcon = (direction: string) => {
    return direction === "inbound" ? "📞" : "📞";
  };

  return (
    <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Call Records
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {callRecords.length} calls found
            </span>
            <button className="rounded-lg bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700">
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Call ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Caller
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Agent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Sentiment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {callRecords.map((call) => (
              <tr 
                key={call.id} 
                className={`hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer ${
                  selectedCall === call.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                }`}
                onClick={() => setSelectedCall(selectedCall === call.id ? null : call.id)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getDirectionIcon(call.direction)}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {call.id}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {call.direction}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {new Date(call.timestamp).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(call.timestamp).toLocaleTimeString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {call.caller}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {call.language}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {call.duration}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {call.outcome}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {call.agent}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(call.status)}`}>
                    {call.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm ${getSentimentColor(call.sentiment)}`}>
                      {call.sentiment === 'positive' ? '😊' : call.sentiment === 'neutral' ? '😐' : '😞'}
                    </span>
                    <span className={`text-sm ${getSentimentColor(call.sentiment)}`}>
                      {call.sentiment}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {call.hasRecording && (
                      <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400">
                        🎵
                      </button>
                    )}
                    {call.hasTranscript && (
                      <button className="text-green-600 hover:text-green-900 dark:text-green-400">
                        📝
                      </button>
                    )}
                    {call.transferred && (
                      <span className="text-blue-600 dark:text-blue-400">🔄</span>
                    )}
                    <button className="text-gray-600 hover:text-gray-900 dark:text-gray-400">
                      👁️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing 1-{callRecords.length} of {callRecords.length} calls
            </span>
          </div>
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
    </div>
  );
}
