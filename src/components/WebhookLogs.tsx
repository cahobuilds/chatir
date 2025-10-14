"use client";

import React, { useState } from "react";

export default function WebhookLogs() {
  const [selectedWebhook, setSelectedWebhook] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const webhookLogs = [
    {
      id: "log-1",
      webhookName: "Call Started Notifications",
      event: "call_started",
      status: "success",
      timestamp: "2024-01-15 14:30:25",
      responseTime: "245ms",
      statusCode: 200,
      payload: {
        call_id: "call_123456",
        agent_id: "agent_789",
        caller_number: "+1234567890",
      },
    },
    {
      id: "log-2",
      webhookName: "CRM Sync Webhook",
      event: "call_ended",
      status: "success",
      timestamp: "2024-01-15 14:29:18",
      responseTime: "1.2s",
      statusCode: 200,
      payload: {
        call_id: "call_123455",
        duration: 180,
        outcome: "resolved",
      },
    },
    {
      id: "log-3",
      webhookName: "Analytics Tracking",
      event: "call_analyzed",
      status: "failed",
      timestamp: "2024-01-15 14:28:45",
      responseTime: "5.0s",
      statusCode: 500,
      error: "Internal server error",
      payload: {
        call_id: "call_123454",
        sentiment_score: 0.8,
        topics: ["billing", "payment"],
      },
    },
    {
      id: "log-4",
      webhookName: "Slack Notifications",
      event: "error_occurred",
      status: "success",
      timestamp: "2024-01-15 14:27:32",
      responseTime: "890ms",
      statusCode: 200,
      payload: {
        error_type: "connection_timeout",
        agent_id: "agent_789",
        call_id: "call_123453",
      },
    },
    {
      id: "log-5",
      webhookName: "Recording Available",
      event: "recording_available",
      status: "success",
      timestamp: "2024-01-15 14:26:15",
      responseTime: "156ms",
      statusCode: 200,
      payload: {
        call_id: "call_123452",
        recording_url: "https://storage.example.com/recordings/call_123452.mp3",
        duration: 180,
      },
    },
    {
      id: "log-6",
      webhookName: "CRM Sync Webhook",
      event: "transcript_ready",
      status: "failed",
      timestamp: "2024-01-15 14:25:08",
      responseTime: "3.2s",
      statusCode: 401,
      error: "Unauthorized - Invalid API key",
      payload: {
        call_id: "call_123451",
        transcript: "Customer called about billing issue...",
      },
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getStatusCodeColor = (code: number) => {
    if (code >= 200 && code < 300) return "text-green-600";
    if (code >= 400 && code < 500) return "text-yellow-600";
    if (code >= 500) return "text-red-600";
    return "text-gray-600";
  };

  const filteredLogs = webhookLogs.filter(log => {
    const webhookMatch = selectedWebhook === "all" || log.webhookName === selectedWebhook;
    const statusMatch = selectedStatus === "all" || log.status === selectedStatus;
    return webhookMatch && statusMatch;
  });

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Webhook Delivery Logs
        </h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedWebhook}
            onChange={(e) => setSelectedWebhook(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Webhooks</option>
            <option value="Call Started Notifications">Call Started Notifications</option>
            <option value="CRM Sync Webhook">CRM Sync Webhook</option>
            <option value="Analytics Tracking">Analytics Tracking</option>
            <option value="Slack Notifications">Slack Notifications</option>
            <option value="Recording Available">Recording Available</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
          <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
            Export Logs
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="pb-3 text-left text-sm font-medium text-gray-900 dark:text-white">
                Webhook
              </th>
              <th className="pb-3 text-left text-sm font-medium text-gray-900 dark:text-white">
                Event
              </th>
              <th className="pb-3 text-left text-sm font-medium text-gray-900 dark:text-white">
                Status
              </th>
              <th className="pb-3 text-left text-sm font-medium text-gray-900 dark:text-white">
                Response Time
              </th>
              <th className="pb-3 text-left text-sm font-medium text-gray-900 dark:text-white">
                Status Code
              </th>
              <th className="pb-3 text-left text-sm font-medium text-gray-900 dark:text-white">
                Timestamp
              </th>
              <th className="pb-3 text-left text-sm font-medium text-gray-900 dark:text-white">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700">
                <td className="py-4">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {log.webhookName}
                  </div>
                </td>
                <td className="py-4">
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    {log.event}
                  </span>
                </td>
                <td className="py-4">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(log.status)}`}>
                    {log.status}
                  </span>
                </td>
                <td className="py-4 text-sm text-gray-600 dark:text-gray-400">
                  {log.responseTime}
                </td>
                <td className="py-4">
                  <span className={`text-sm font-medium ${getStatusCodeColor(log.statusCode)}`}>
                    {log.statusCode}
                  </span>
                </td>
                <td className="py-4 text-sm text-gray-600 dark:text-gray-400">
                  {log.timestamp}
                </td>
                <td className="py-4">
                  <div className="flex space-x-2">
                    <button className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800">
                      View
                    </button>
                    {log.status === "failed" && (
                      <button className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:hover:bg-yellow-800">
                        Retry
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredLogs.length === 0 && (
        <div className="py-8 text-center">
          <div className="text-gray-500 dark:text-gray-400">
            No webhook logs found matching your criteria
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Showing {filteredLogs.length} of {webhookLogs.length} logs
        </div>
        <div className="flex space-x-2">
          <button className="rounded-lg bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
            Previous
          </button>
          <button className="rounded-lg bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700">
            1
          </button>
          <button className="rounded-lg bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
            2
          </button>
          <button className="rounded-lg bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
