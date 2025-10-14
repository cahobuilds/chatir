"use client";

import React, { useState } from "react";

interface KnowledgeItem {
  id: string;
  title: string;
  category: string;
  type: "document" | "url" | "api";
  size: string;
  lastUpdated: string;
  status: "synced" | "syncing" | "error";
  usage: number;
  relevance: number;
  source: string;
}

const knowledgeItems: KnowledgeItem[] = [
  {
    id: "KB-001",
    title: "Customer Service FAQ",
    category: "FAQ",
    type: "document",
    size: "2.3 MB",
    lastUpdated: "2 hours ago",
    status: "synced",
    usage: 245,
    relevance: 95,
    source: "Internal"
  },
  {
    id: "KB-002",
    title: "Product Return Policy",
    category: "Policies",
    type: "document",
    size: "1.1 MB",
    lastUpdated: "1 day ago",
    status: "synced",
    usage: 189,
    relevance: 88,
    source: "Internal"
  },
  {
    id: "KB-003",
    title: "Technical Support Wiki",
    category: "Troubleshooting",
    type: "url",
    size: "N/A",
    lastUpdated: "3 hours ago",
    status: "syncing",
    usage: 156,
    relevance: 92,
    source: "Confluence"
  },
  {
    id: "KB-004",
    title: "Billing Procedures",
    category: "Procedures",
    type: "document",
    size: "3.2 MB",
    lastUpdated: "5 hours ago",
    status: "synced",
    usage: 98,
    relevance: 85,
    source: "Internal"
  },
  {
    id: "KB-005",
    title: "Product Specifications",
    category: "Product Information",
    type: "api",
    size: "N/A",
    lastUpdated: "1 hour ago",
    status: "error",
    usage: 67,
    relevance: 78,
    source: "Product API"
  },
  {
    id: "KB-006",
    title: "Training Manual v2.1",
    category: "Training",
    type: "document",
    size: "5.7 MB",
    lastUpdated: "6 hours ago",
    status: "synced",
    usage: 134,
    relevance: 90,
    source: "Internal"
  }
];

export default function KnowledgeBaseContent() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "synced": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "syncing": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "error": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "synced": return "✅";
      case "syncing": return "🔄";
      case "error": return "❌";
      default: return "❓";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "document": return "📄";
      case "url": return "🌐";
      case "api": return "🔗";
      default: return "📄";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "FAQ": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "Policies": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "Procedures": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "Product Information": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "Troubleshooting": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "Training": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  return (
    <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Knowledge Base Content
          </h3>
          <div className="flex items-center space-x-2">
            <button className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
              Bulk Actions
            </button>
            <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700">
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
                <input type="checkbox" className="rounded border-gray-300" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Content
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Usage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Relevance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {knowledgeItems.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input type="checkbox" className="rounded border-gray-300" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getTypeIcon(item.type)}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {item.id} • {item.source} • Updated {item.lastUpdated}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(item.category)}`}>
                    {item.category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {item.size}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${Math.min((item.usage / 250) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {item.usage}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${item.relevance}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {item.relevance}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <span>{getStatusIcon(item.status)}</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400">
                      👁️
                    </button>
                    <button className="text-gray-600 hover:text-gray-900 dark:text-gray-400">
                      ✏️
                    </button>
                    <button className="text-red-600 hover:text-red-900 dark:text-red-400">
                      🗑️
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
              Showing 1-{knowledgeItems.length} of {knowledgeItems.length} items
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
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
