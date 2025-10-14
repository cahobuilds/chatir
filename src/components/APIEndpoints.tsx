"use client";

import React, { useState } from "react";
import { 
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  UserGroupIcon,
  CogIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline";

export default function APIEndpoints() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedEndpoint, setSelectedEndpoint] = useState("");

  const endpoints = [
    {
      category: "Calls",
      icon: PhoneIcon,
      endpoints: [
        {
          method: "GET",
          path: "/api/v1/calls",
          description: "List all calls",
          color: "text-green-600"
        },
        {
          method: "POST",
          path: "/api/v1/calls",
          description: "Create new call",
          color: "text-blue-600"
        },
        {
          method: "GET",
          path: "/api/v1/calls/{id}",
          description: "Get call details",
          color: "text-green-600"
        },
        {
          method: "PUT",
          path: "/api/v1/calls/{id}",
          description: "Update call",
          color: "text-yellow-600"
        },
        {
          method: "DELETE",
          path: "/api/v1/calls/{id}",
          description: "Delete call",
          color: "text-red-600"
        }
      ]
    },
    {
      category: "Agents",
      icon: UserGroupIcon,
      endpoints: [
        {
          method: "GET",
          path: "/api/v1/agents",
          description: "List all agents",
          color: "text-green-600"
        },
        {
          method: "POST",
          path: "/api/v1/agents",
          description: "Create new agent",
          color: "text-blue-600"
        },
        {
          method: "GET",
          path: "/api/v1/agents/{id}",
          description: "Get agent details",
          color: "text-green-600"
        },
        {
          method: "PUT",
          path: "/api/v1/agents/{id}",
          description: "Update agent",
          color: "text-yellow-600"
        },
        {
          method: "POST",
          path: "/api/v1/agents/{id}/train",
          description: "Train agent",
          color: "text-blue-600"
        }
      ]
    },
    {
      category: "Analytics",
      icon: ChartBarIcon,
      endpoints: [
        {
          method: "GET",
          path: "/api/v1/analytics/overview",
          description: "Get analytics overview",
          color: "text-green-600"
        },
        {
          method: "GET",
          path: "/api/v1/analytics/calls",
          description: "Get call analytics",
          color: "text-green-600"
        },
        {
          method: "GET",
          path: "/api/v1/analytics/agents",
          description: "Get agent performance",
          color: "text-green-600"
        },
        {
          method: "GET",
          path: "/api/v1/analytics/quality",
          description: "Get quality metrics",
          color: "text-green-600"
        }
      ]
    },
    {
      category: "Chat",
      icon: ChatBubbleLeftRightIcon,
      endpoints: [
        {
          method: "POST",
          path: "/api/v1/chat/send",
          description: "Send chat message",
          color: "text-blue-600"
        },
        {
          method: "GET",
          path: "/api/v1/chat/conversations",
          description: "List conversations",
          color: "text-green-600"
        },
        {
          method: "GET",
          path: "/api/v1/chat/conversations/{id}",
          description: "Get conversation",
          color: "text-green-600"
        }
      ]
    },
    {
      category: "System",
      icon: CogIcon,
      endpoints: [
        {
          method: "GET",
          path: "/api/v1/system/health",
          description: "System health check",
          color: "text-green-600"
        },
        {
          method: "GET",
          path: "/api/v1/system/status",
          description: "System status",
          color: "text-green-600"
        },
        {
          method: "POST",
          path: "/api/v1/system/backup",
          description: "Create backup",
          color: "text-blue-600"
        }
      ]
    },
    {
      category: "Knowledge",
      icon: DocumentTextIcon,
      endpoints: [
        {
          method: "GET",
          path: "/api/v1/knowledge/articles",
          description: "List knowledge articles",
          color: "text-green-600"
        },
        {
          method: "POST",
          path: "/api/v1/knowledge/articles",
          description: "Create article",
          color: "text-blue-600"
        },
        {
          method: "GET",
          path: "/api/v1/knowledge/search",
          description: "Search knowledge base",
          color: "text-green-600"
        }
      ]
    }
  ];

  const categories = [
    { id: "all", name: "All Endpoints", count: endpoints.reduce((acc, cat) => acc + cat.endpoints.length, 0) },
    ...endpoints.map(cat => ({
      id: cat.category.toLowerCase(),
      name: cat.category,
      count: cat.endpoints.length
    }))
  ];

  const filteredEndpoints = selectedCategory === "all" 
    ? endpoints 
    : endpoints.filter(cat => cat.category.toLowerCase() === selectedCategory);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          API Endpoints
        </h3>
      </div>

      <div className="p-6">
        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                  selectedCategory === category.id
                    ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>
        </div>

        {/* Endpoints List */}
        <div className="space-y-4">
          {filteredEndpoints.map((category) => (
            <div key={category.category}>
              <div className="flex items-center space-x-2 mb-3">
                <category.icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  {category.category}
                </h4>
              </div>
              
              <div className="space-y-2">
                {category.endpoints.map((endpoint, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedEndpoint(`${endpoint.method} ${endpoint.path}`)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedEndpoint === `${endpoint.method} ${endpoint.path}`
                        ? "border-indigo-300 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-900/20"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-mono font-semibold px-2 py-1 rounded ${endpoint.color} bg-gray-100 dark:bg-gray-700`}>
                        {endpoint.method}
                      </span>
                    </div>
                    <p className="text-sm font-mono text-gray-900 dark:text-white mb-1">
                      {endpoint.path}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {endpoint.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
