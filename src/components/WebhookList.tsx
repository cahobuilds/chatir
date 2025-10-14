"use client";

import React, { useState } from "react";

export default function WebhookList() {
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);

  const webhooks = [
    {
      id: "webhook-1",
      name: "Call Started Notifications",
      url: "https://api.example.com/webhooks/call-started",
      events: ["call_started", "call_answered"],
      status: "active",
      lastDelivery: "30 seconds ago",
      successRate: 99.2,
      totalDeliveries: 1247,
      failedDeliveries: 10,
      nextRetry: null,
    },
    {
      id: "webhook-2",
      name: "CRM Sync Webhook",
      url: "https://crm.example.com/api/webhooks/ai-care",
      events: ["call_ended", "transcript_ready", "call_analyzed"],
      status: "active",
      lastDelivery: "2 minutes ago",
      successRate: 97.8,
      totalDeliveries: 892,
      failedDeliveries: 19,
      nextRetry: null,
    },
    {
      id: "webhook-3",
      name: "Analytics Tracking",
      url: "https://analytics.example.com/events",
      events: ["agent_created", "agent_updated", "error_occurred"],
      status: "failed",
      lastDelivery: "15 minutes ago",
      successRate: 85.5,
      totalDeliveries: 567,
      failedDeliveries: 82,
      nextRetry: "2 minutes",
    },
    {
      id: "webhook-4",
      name: "Slack Notifications",
      url: "https://hooks.slack.com/services/...",
      events: ["transfer_initiated", "voicemail_detected", "error_occurred"],
      status: "active",
      lastDelivery: "1 minute ago",
      successRate: 98.9,
      totalDeliveries: 156,
      failedDeliveries: 2,
      nextRetry: null,
    },
    {
      id: "webhook-5",
      name: "Recording Available",
      url: "https://storage.example.com/webhooks/recording",
      events: ["recording_available"],
      status: "active",
      lastDelivery: "5 minutes ago",
      successRate: 100.0,
      totalDeliveries: 2341,
      failedDeliveries: 0,
      nextRetry: null,
    },
    {
      id: "webhook-6",
      name: "Quality Monitoring",
      url: "https://qa.example.com/webhooks/quality",
      events: ["call_analyzed", "transcript_ready"],
      status: "paused",
      lastDelivery: "1 hour ago",
      successRate: 96.3,
      totalDeliveries: 445,
      failedDeliveries: 16,
      nextRetry: null,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "paused":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Configured Webhooks
        </h2>
        <div className="flex items-center space-x-2">
          <select className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
            <option>All Status</option>
            <option>Active</option>
            <option>Failed</option>
            <option>Paused</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {webhooks.map((webhook) => (
          <div
            key={webhook.id}
            className={`rounded-lg border p-4 cursor-pointer transition-colors ${
              selectedWebhook === webhook.id
                ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-900"
                : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
            }`}
            onClick={() => setSelectedWebhook(selectedWebhook === webhook.id ? null : webhook.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center dark:bg-indigo-900">
                  <span className="text-indigo-600 font-semibold dark:text-indigo-300">
                    🔗
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {webhook.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {webhook.url}
                  </p>
                  <div className="mt-1 flex items-center space-x-4">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(webhook.status)}`}>
                      {webhook.status}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {webhook.events.length} events
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {webhook.successRate}% success
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {webhook.totalDeliveries} deliveries
                  </div>
                  {webhook.failedDeliveries > 0 && (
                    <div className="text-xs text-red-500">
                      {webhook.failedDeliveries} failed
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-900 dark:text-white">
                    Last: {webhook.lastDelivery}
                  </div>
                  {webhook.nextRetry && (
                    <div className="text-xs text-orange-500">
                      Retry in: {webhook.nextRetry}
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button className="rounded-lg bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                    Test
                  </button>
                  <button className="rounded-lg bg-blue-100 px-3 py-1 text-sm text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800">
                    Edit
                  </button>
                  <button className="rounded-lg bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800">
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {selectedWebhook === webhook.id && (
              <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Event Types
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.map((event) => (
                        <span
                          key={event}
                          className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        >
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Delivery Statistics
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total:</span>
                        <span className="font-medium">{webhook.totalDeliveries}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Successful:</span>
                        <span className="font-medium text-green-600">
                          {Math.round(webhook.totalDeliveries * webhook.successRate / 100)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Failed:</span>
                        <span className="font-medium text-red-600">{webhook.failedDeliveries}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
