"use client";

import React, { useState } from "react";
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon
} from "@heroicons/react/24/outline";

interface QualityMetric {
  name: string;
  value: string;
  change: number;
  trend: "up" | "down" | "stable";
  target: string;
  status: "good" | "warning" | "critical";
}

const mockMetrics: QualityMetric[] = [
  {
    name: "Overall Quality Score",
    value: "94.2%",
    change: 2.1,
    trend: "up",
    target: "90%",
    status: "good"
  },
  {
    name: "First Call Resolution",
    value: "87.5%",
    change: -1.2,
    trend: "down",
    target: "85%",
    status: "good"
  },
  {
    name: "Customer Satisfaction",
    value: "4.6/5.0",
    change: 0.1,
    trend: "up",
    target: "4.5/5.0",
    status: "good"
  },
  {
    name: "Average Handle Time",
    value: "3:24",
    change: -0.3,
    trend: "up",
    target: "4:00",
    status: "good"
  },
  {
    name: "Compliance Rate",
    value: "98.7%",
    change: 0.5,
    trend: "up",
    target: "95%",
    status: "good"
  },
  {
    name: "Script Adherence",
    value: "91.3%",
    change: -2.1,
    trend: "down",
    target: "90%",
    status: "warning"
  },
  {
    name: "Escalation Rate",
    value: "8.2%",
    change: 1.1,
    trend: "down",
    target: "10%",
    status: "good"
  },
  {
    name: "Call Abandonment",
    value: "2.1%",
    change: 0.3,
    trend: "down",
    target: "5%",
    status: "good"
  }
];

export default function QualityMetrics() {
  const [selectedPeriod, setSelectedPeriod] = useState("7d");

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />;
      case "down":
        return <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />;
      default:
        return <MinusIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getChangeColor = (change: number, trend: string) => {
    if (trend === "up") {
      return change > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
    } else if (trend === "down") {
      return change < 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
    }
    return "text-gray-600 dark:text-gray-400";
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Quality Metrics Overview
            </h3>
          </div>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mockMetrics.map((metric, index) => (
            <div
              key={index}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  {metric.name}
                </h4>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(metric.status)}`}>
                  {metric.status}
                </span>
              </div>
              
              <div className="mb-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metric.value}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-1">
                  {getTrendIcon(metric.trend)}
                  <span className={`font-medium ${getChangeColor(metric.change, metric.trend)}`}>
                    {metric.change > 0 ? "+" : ""}{metric.change}%
                  </span>
                </div>
                <span className="text-gray-500 dark:text-gray-400">
                  Target: {metric.target}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {mockMetrics.filter(m => m.status === "good").length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Metrics on Target</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {mockMetrics.filter(m => m.status === "warning").length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Needs Attention</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                {mockMetrics.filter(m => m.status === "critical").length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Critical Issues</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}