"use client";

import React from "react";

interface MetricCard {
  title: string;
  value: string | number;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: string;
  color: string;
}

const metrics: MetricCard[] = [
  {
    title: "Active Calls",
    value: "47",
    change: "+12%",
    trend: "up",
    icon: "📞",
    color: "bg-blue-500"
  },
  {
    title: "Calls in Queue",
    value: "8",
    change: "-5%",
    trend: "down",
    icon: "⏳",
    color: "bg-yellow-500"
  },
  {
    title: "Avg Wait Time",
    value: "1m 23s",
    change: "-15%",
    trend: "down",
    icon: "⏱️",
    color: "bg-green-500"
  },
  {
    title: "Service Level",
    value: "94.2%",
    change: "+2.1%",
    trend: "up",
    icon: "🎯",
    color: "bg-purple-500"
  },
  {
    title: "Success Rate",
    value: "87.5%",
    change: "+3.2%",
    trend: "up",
    icon: "✅",
    color: "bg-emerald-500"
  },
  {
    title: "Avg Latency",
    value: "145ms",
    change: "-8ms",
    trend: "down",
    icon: "⚡",
    color: "bg-orange-500"
  }
];

export default function RealTimeMetrics() {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Real-Time Operations
        </h2>
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Live
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex items-center justify-between">
              <div className={`rounded-lg p-2 ${metric.color}`}>
                <span className="text-white text-lg">{metric.icon}</span>
              </div>
              <div className={`text-sm font-medium ${
                metric.trend === 'up' ? 'text-green-600' : 
                metric.trend === 'down' ? 'text-red-600' : 
                'text-gray-600'
              }`}>
                {metric.change}
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metric.value}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {metric.title}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
