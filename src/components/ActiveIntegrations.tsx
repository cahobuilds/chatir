"use client";

import React from "react";

export default function ActiveIntegrations() {
  const activeIntegrations = [
    {
      id: "twilio",
      name: "Twilio Voice",
      category: "Telephony",
      status: "connected",
      lastSync: "2 min ago",
      callsToday: 1247,
      icon: "📞",
      color: "bg-red-500",
      description: "Voice and SMS communication",
    },
    {
      id: "salesforce",
      name: "Salesforce CRM",
      category: "CRM",
      status: "connected",
      lastSync: "5 min ago",
      callsToday: 892,
      icon: "☁️",
      color: "bg-blue-500",
      description: "Customer relationship management",
    },
    {
      id: "slack",
      name: "Slack Notifications",
      category: "Business Tools",
      status: "connected",
      lastSync: "1 min ago",
      callsToday: 156,
      icon: "💬",
      color: "bg-purple-500",
      description: "Team notifications and alerts",
    },
    {
      id: "google-analytics",
      name: "Google Analytics",
      category: "Analytics",
      status: "connected",
      lastSync: "10 min ago",
      callsToday: 2341,
      icon: "📊",
      color: "bg-orange-500",
      description: "Website and app analytics",
    },
    {
      id: "hubspot",
      name: "HubSpot CRM",
      category: "CRM",
      status: "connected",
      lastSync: "3 min ago",
      callsToday: 567,
      icon: "🎯",
      color: "bg-green-500",
      description: "Marketing and sales automation",
    },
    {
      id: "calendly",
      name: "Calendly",
      category: "Scheduling",
      status: "connected",
      lastSync: "7 min ago",
      callsToday: 89,
      icon: "📅",
      color: "bg-indigo-500",
      description: "Appointment scheduling",
    },
  ];

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Active Integrations
        </h2>
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            All systems operational
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {activeIntegrations.map((integration) => (
          <div
            key={integration.id}
            className="rounded-lg border border-gray-200 p-4 hover:shadow-sm dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`h-12 w-12 rounded-lg ${integration.color} flex items-center justify-center`}>
                  <span className="text-2xl">{integration.icon}</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {integration.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {integration.description}
                  </p>
                  <div className="mt-1 flex items-center space-x-4">
                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                      {integration.category}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Last sync: {integration.lastSync}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {integration.callsToday.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    interactions today
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="rounded-lg bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                    Configure
                  </button>
                  <button className="rounded-lg bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800">
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              Integration Health
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              All integrations are running smoothly with no issues detected
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">100%</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Uptime
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
