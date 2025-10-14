"use client";

import React, { useState } from "react";

export default function WebhookHeader() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Webhook Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure real-time event notifications and API callbacks
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
            Test All Webhooks
          </button>
          <button className="rounded-lg bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700">
            Create Webhook
          </button>
        </div>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search webhooks..."
              className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">8</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Active</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">2</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Failed</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-6 flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Webhook service operational
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Last delivery:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            30 seconds ago
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Success rate:</span>
          <span className="text-sm font-medium text-green-600">
            98.5%
          </span>
        </div>
      </div>
    </div>
  );
}
