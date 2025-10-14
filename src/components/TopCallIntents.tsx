"use client";

import React from "react";

interface CallIntent {
  intent: string;
  count: number;
  percentage: number;
  trend: "up" | "down" | "stable";
  category: string;
}

const callIntents: CallIntent[] = [
  {
    intent: "Billing Inquiry",
    count: 234,
    percentage: 32.1,
    trend: "up",
    category: "Support"
  },
  {
    intent: "Technical Support",
    count: 189,
    percentage: 25.9,
    trend: "stable",
    category: "Support"
  },
  {
    intent: "Product Information",
    count: 156,
    percentage: 21.4,
    trend: "down",
    category: "Sales"
  },
  {
    intent: "Account Changes",
    count: 98,
    percentage: 13.4,
    trend: "up",
    category: "Account"
  },
  {
    intent: "Refund Request",
    count: 52,
    percentage: 7.1,
    trend: "stable",
    category: "Support"
  }
];

export default function TopCallIntents() {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return "📈";
      case "down": return "📉";
      case "stable": return "➡️";
      default: return "➡️";
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up": return "text-green-600";
      case "down": return "text-red-600";
      case "stable": return "text-gray-600";
      default: return "text-gray-600";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Support": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "Sales": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "Account": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Top Call Intents
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Last 24 hours
          </span>
          <button className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            View All
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {callIntents.map((intent, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex items-center space-x-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
                {index + 1}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {intent.intent}
                  </p>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${getCategoryColor(intent.category)}`}>
                    {intent.category}
                  </span>
                </div>
                <div className="mt-1 flex items-center space-x-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {intent.count} calls
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">•</span>
                  <span className={`text-sm ${getTrendColor(intent.trend)}`}>
                    {getTrendIcon(intent.trend)} {intent.trend}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {intent.percentage}%
              </p>
              <div className="w-16 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div 
                  className="bg-indigo-500 h-2 rounded-full"
                  style={{ width: `${intent.percentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 rounded-lg bg-indigo-50 p-4 dark:bg-indigo-900/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
              Total Call Volume
            </p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {callIntents.reduce((sum, intent) => sum + intent.count, 0)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-indigo-700 dark:text-indigo-300">
              Most Common
            </p>
            <p className="font-medium text-indigo-900 dark:text-indigo-100">
              {callIntents[0].intent}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
