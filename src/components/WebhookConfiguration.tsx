"use client";

import React, { useState } from "react";

export default function WebhookConfiguration() {
  const [webhookName, setWebhookName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [secret, setSecret] = useState("");
  const [isRetryEnabled, setIsRetryEnabled] = useState(true);
  const [maxRetries, setMaxRetries] = useState(3);

  const availableEvents = [
    "call_started",
    "call_ended",
    "call_analyzed",
    "transcript_ready",
    "recording_available",
    "agent_created",
    "agent_updated",
    "error_occurred",
    "transfer_initiated",
    "voicemail_detected",
    "call_answered",
    "call_failed",
  ];

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev => 
      prev.includes(event) 
        ? prev.filter(e => e !== event)
        : [...prev, event]
    );
  };

  const handleCreateWebhook = () => {
    // Handle webhook creation logic
    console.log("Creating webhook:", {
      name: webhookName,
      url: webhookUrl,
      events: selectedEvents,
      secret,
      retryEnabled: isRetryEnabled,
      maxRetries,
    });
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
        Create New Webhook
      </h2>

      <div className="space-y-6">
        {/* Webhook Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Webhook Name
          </label>
          <input
            type="text"
            value={webhookName}
            onChange={(e) => setWebhookName(e.target.value)}
            placeholder="Enter webhook name"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Webhook URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Webhook URL
          </label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://your-endpoint.com/webhook"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Event Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Events
          </label>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-300 p-3 dark:border-gray-600">
            <div className="grid grid-cols-1 gap-2">
              {availableEvents.map((event) => (
                <label key={event} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {event}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {selectedEvents.length} event(s) selected
          </div>
        </div>

        {/* Secret */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Webhook Secret (Optional)
          </label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Enter webhook secret for verification"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Used to verify webhook authenticity
          </p>
        </div>

        {/* Retry Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enable Retry Logic
            </label>
            <input
              type="checkbox"
              checked={isRetryEnabled}
              onChange={(e) => setIsRetryEnabled(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
          </div>

          {isRetryEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Retries
              </label>
              <select
                value={maxRetries}
                onChange={(e) => setMaxRetries(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
              </select>
            </div>
          )}
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreateWebhook}
          disabled={!webhookName || !webhookUrl || selectedEvents.length === 0}
          className="w-full rounded-lg bg-indigo-600 py-2 text-white hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Create Webhook
        </button>
      </div>

      {/* Quick Templates */}
      <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700">
        <h3 className="mb-4 font-medium text-gray-900 dark:text-white">
          Quick Templates
        </h3>
        <div className="space-y-2">
          <button 
            className="w-full rounded-lg bg-gray-100 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            onClick={() => {
              setWebhookName("Call Analytics");
              setSelectedEvents(["call_started", "call_ended", "call_analyzed"]);
            }}
          >
            📊 Call Analytics
          </button>
          <button 
            className="w-full rounded-lg bg-gray-100 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            onClick={() => {
              setWebhookName("CRM Sync");
              setSelectedEvents(["call_ended", "transcript_ready", "call_analyzed"]);
            }}
          >
            🔄 CRM Sync
          </button>
          <button 
            className="w-full rounded-lg bg-gray-100 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            onClick={() => {
              setWebhookName("Error Alerts");
              setSelectedEvents(["error_occurred", "call_failed"]);
            }}
          >
            🚨 Error Alerts
          </button>
        </div>
      </div>
    </div>
  );
}
