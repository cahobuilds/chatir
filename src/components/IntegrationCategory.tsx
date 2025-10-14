"use client";

import React, { useState } from "react";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: "available" | "connected" | "pending";
  category: string;
}

interface IntegrationCategoryProps {
  name: string;
  integrations: Integration[];
  description?: string;
}

export default function IntegrationCategory({ 
  name, 
  integrations, 
  description 
}: IntegrationCategoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const connectedCount = integrations.filter(i => i.status === "connected").length;
  const pendingCount = integrations.filter(i => i.status === "pending").length;

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-4">
          <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center dark:bg-indigo-900">
            <span className="text-indigo-600 font-semibold dark:text-indigo-300">
              {name.charAt(0)}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {name}
            </h3>
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {connectedCount} connected, {pendingCount} pending
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {integrations.length} total available
            </div>
          </div>
          <button className="rounded-lg bg-gray-100 p-2 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600">
            <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="rounded-lg border border-gray-200 p-4 hover:shadow-sm dark:border-gray-700"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center dark:bg-gray-700">
                  <span className="text-lg">{integration.icon}</span>
                </div>
                <div className={`rounded-full px-2 py-1 text-xs font-medium ${
                  integration.status === "connected" 
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : integration.status === "pending"
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                }`}>
                  {integration.status}
                </div>
              </div>
              
              <h4 className="mb-2 font-medium text-gray-900 dark:text-white">
                {integration.name}
              </h4>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                {integration.description}
              </p>
              
              <div className="flex space-x-2">
                {integration.status === "connected" ? (
                  <>
                    <button className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                      Configure
                    </button>
                    <button className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800">
                      Disconnect
                    </button>
                  </>
                ) : integration.status === "pending" ? (
                  <button className="w-full rounded-lg bg-yellow-100 px-3 py-2 text-sm text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:hover:bg-yellow-800">
                    Complete Setup
                  </button>
                ) : (
                  <button className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700">
                    Connect
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
