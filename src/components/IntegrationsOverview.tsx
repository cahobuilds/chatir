"use client";

import React from "react";

export default function IntegrationsOverview() {
  const categories = [
    {
      name: "Telephony Providers",
      count: 4,
      active: 2,
      color: "bg-blue-500",
      description: "Connect with voice and SMS providers",
      integrations: ["Twilio", "Vonage", "Telnyx", "Bandwidth"],
    },
    {
      name: "CRM Systems",
      count: 6,
      active: 3,
      color: "bg-green-500",
      description: "Sync customer data and interactions",
      integrations: ["Salesforce", "HubSpot", "Zendesk", "Freshdesk", "Pipedrive", "Custom CRM"],
    },
    {
      name: "Calendar & Scheduling",
      count: 4,
      active: 1,
      color: "bg-purple-500",
      description: "Manage appointments and availability",
      integrations: ["Calendly", "Cal.com", "Google Calendar", "Outlook"],
    },
    {
      name: "Business Tools",
      count: 5,
      active: 4,
      color: "bg-orange-500",
      description: "Collaboration and automation tools",
      integrations: ["Slack", "Microsoft Teams", "Zapier", "Make", "Webhooks"],
    },
    {
      name: "Analytics Platforms",
      count: 4,
      active: 2,
      color: "bg-pink-500",
      description: "Track performance and insights",
      integrations: ["Google Analytics", "Mixpanel", "Segment", "Amplitude"],
    },
  ];

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
        Integration Overview
      </h2>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <div
            key={category.name}
            className="rounded-lg border border-gray-200 p-4 hover:shadow-md dark:border-gray-700"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className={`h-10 w-10 rounded-lg ${category.color} flex items-center justify-center`}>
                <span className="text-white font-semibold">
                  {category.name.charAt(0)}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {category.active}/{category.count} active
                </div>
                <div className="text-xs text-gray-400">
                  {Math.round((category.active / category.count) * 100)}% connected
                </div>
              </div>
            </div>
            
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
              {category.name}
            </h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {category.description}
            </p>
            
            <div className="mb-4">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Available Integrations:
              </div>
              <div className="flex flex-wrap gap-1">
                {category.integrations.slice(0, 3).map((integration) => (
                  <span
                    key={integration}
                    className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  >
                    {integration}
                  </span>
                ))}
                {category.integrations.length > 3 && (
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    +{category.integrations.length - 3} more
                  </span>
                )}
              </div>
            </div>
            
            <button className="w-full rounded-lg bg-indigo-600 py-2 text-sm text-white hover:bg-indigo-700">
              View Integrations
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
