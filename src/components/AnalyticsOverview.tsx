"use client";

import React from "react";

interface OverviewMetric {
  title: string;
  value: string | number;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: string;
  color: string;
  description: string;
}

const overviewMetrics: OverviewMetric[] = [
  {
    title: "Total Calls",
    value: "12,847",
    change: "+15.3%",
    trend: "up",
    icon: "📞",
    color: "bg-blue-500",
    description: "vs last period"
  },
  {
    title: "Answer Rate",
    value: "94.2%",
    change: "+2.1%",
    trend: "up",
    icon: "✅",
    color: "bg-green-500",
    description: "vs last period"
  },
  {
    title: "Avg Handle Time",
    value: "2m 34s",
    change: "-12s",
    trend: "down",
    icon: "⏱️",
    color: "bg-purple-500",
    description: "vs last period"
  },
  {
    title: "Customer Satisfaction",
    value: "4.7/5",
    change: "+0.3",
    trend: "up",
    icon: "😊",
    color: "bg-yellow-500",
    description: "average rating"
  },
  {
    title: "First Call Resolution",
    value: "78.5%",
    change: "+5.2%",
    trend: "up",
    icon: "🎯",
    color: "bg-indigo-500",
    description: "vs last period"
  },
  {
    title: "Cost per Call",
    value: "$2.34",
    change: "-$0.18",
    trend: "down",
    icon: "💰",
    color: "bg-emerald-500",
    description: "vs last period"
  }
];

export default function AnalyticsOverview() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {overviewMetrics.map((metric, index) => (
        <div
          key={index}
          className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800"
        >
          <div className="flex items-center justify-between">
            <div className={`rounded-lg p-3 ${metric.color}`}>
              <span className="text-white text-xl">{metric.icon}</span>
            </div>
            <div className={`text-sm font-medium ${
              metric.trend === 'up' ? 'text-green-600' : 
              metric.trend === 'down' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {metric.change}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {metric.value}
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {metric.title}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {metric.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
