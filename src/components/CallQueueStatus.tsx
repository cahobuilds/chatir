"use client";

import React, { useState } from "react";
import { 
  QueueListIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from "@heroicons/react/24/outline";

interface QueueItem {
  id: string;
  customerName: string;
  phoneNumber: string;
  issue: string;
  priority: "high" | "medium" | "low";
  waitTime: string;
  estimatedWait: string;
  language: string;
  source: "phone" | "web" | "app";
}

const mockQueueItems: QueueItem[] = [
  {
    id: "1",
    customerName: "Alice Johnson",
    phoneNumber: "+1 (555) 123-4567",
    issue: "Billing dispute",
    priority: "high",
    waitTime: "2:34",
    estimatedWait: "5 minutes",
    language: "English",
    source: "phone"
  },
  {
    id: "2",
    customerName: "Bob Smith",
    phoneNumber: "+1 (555) 987-6543",
    issue: "Technical support",
    priority: "medium",
    waitTime: "1:45",
    estimatedWait: "3 minutes",
    language: "English",
    source: "web"
  },
  {
    id: "3",
    customerName: "Carlos Rodriguez",
    phoneNumber: "+1 (555) 456-7890",
    issue: "Account inquiry",
    priority: "low",
    waitTime: "0:58",
    estimatedWait: "2 minutes",
    language: "Spanish",
    source: "app"
  },
  {
    id: "4",
    customerName: "Diana Chen",
    phoneNumber: "+1 (555) 321-0987",
    issue: "Product information",
    priority: "low",
    waitTime: "0:23",
    estimatedWait: "1 minute",
    language: "English",
    source: "phone"
  }
];

export default function CallQueueStatus() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [queueItems, setQueueItems] = useState<QueueItem[]>(mockQueueItems);
  const [sortBy, setSortBy] = useState<"priority" | "waitTime">("priority");

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "phone":
        return "📞";
      case "web":
        return "🌐";
      case "app":
        return "📱";
      default:
        return "📞";
    }
  };

  const getLanguageFlag = (language: string) => {
    switch (language) {
      case "English":
        return "🇺🇸";
      case "Spanish":
        return "🇪🇸";
      case "French":
        return "🇫🇷";
      case "German":
        return "🇩🇪";
      default:
        return "🌍";
    }
  };

  const sortedQueueItems = [...queueItems].sort((a, b) => {
    if (sortBy === "priority") {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    } else {
      // Sort by wait time (longest first)
      const aTime = parseInt(a.waitTime.split(":")[0]) * 60 + parseInt(a.waitTime.split(":")[1]);
      const bTime = parseInt(b.waitTime.split(":")[0]) * 60 + parseInt(b.waitTime.split(":")[1]);
      return bTime - aTime;
    }
  });

  const getWaitTimeColor = (waitTime: string) => {
    const minutes = parseInt(waitTime.split(":")[0]);
    if (minutes >= 5) return "text-red-600 dark:text-red-400";
    if (minutes >= 3) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  const totalWaitTime = queueItems.reduce((total, item) => {
    const minutes = parseInt(item.waitTime.split(":")[0]);
    const seconds = parseInt(item.waitTime.split(":")[1]);
    return total + (minutes * 60 + seconds);
  }, 0);

  const averageWaitTime = queueItems.length > 0 
    ? Math.round(totalWaitTime / queueItems.length / 60) 
    : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <QueueListIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Call Queue
            </h3>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => setSortBy("priority")}
              className={`px-2 py-1 text-xs font-medium rounded ${
                sortBy === "priority"
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
              }`}
            >
              Priority
            </button>
            <button
              onClick={() => setSortBy("waitTime")}
              className={`px-2 py-1 text-xs font-medium rounded ${
                sortBy === "waitTime"
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
              }`}
            >
              Wait Time
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Queue Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {queueItems.length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">In Queue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {averageWaitTime}m
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Avg Wait</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {queueItems.filter(item => item.priority === "high").length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">High Priority</div>
          </div>
        </div>

        {/* Queue Items */}
        <div className="space-y-3">
          {sortedQueueItems.map((item) => (
            <div
              key={item.id}
              className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.customerName}
                    </h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                      {item.priority}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-2">
                      <span>{getSourceIcon(item.source)}</span>
                      <span>{item.phoneNumber}</span>
                      <span>{getLanguageFlag(item.language)}</span>
                    </div>
                    <p>Issue: {item.issue}</p>
                    <div className="flex items-center justify-between">
                      <span>Wait Time:</span>
                      <span className={`font-medium ${getWaitTimeColor(item.waitTime)}`}>
                        {item.waitTime}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Est. Wait:</span>
                      <span className="font-medium">{item.estimatedWait}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-1 ml-3">
                  <button className="p-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                    <CheckCircleIcon className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {queueItems.length === 0 && (
          <div className="text-center py-8">
            <QueueListIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No calls in queue
            </p>
          </div>
        )}

        {/* Queue Actions */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-2">
            <button className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              <ArrowUpIcon className="w-4 h-4" />
              <span>Prioritize Queue</span>
            </button>
            <button className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              <ArrowDownIcon className="w-4 h-4" />
              <span>Auto Assign</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
