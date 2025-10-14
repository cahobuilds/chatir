"use client";

import React, { useState } from "react";
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon
} from "@heroicons/react/24/outline";

interface TrendData {
  period: string;
  qualityScore: number;
  customerSatisfaction: number;
  firstCallResolution: number;
  averageHandleTime: number;
}

const mockTrendData: TrendData[] = [
  { period: "Week 1", qualityScore: 92.1, customerSatisfaction: 4.3, firstCallResolution: 85.2, averageHandleTime: 3.8 },
  { period: "Week 2", qualityScore: 93.5, customerSatisfaction: 4.4, firstCallResolution: 86.1, averageHandleTime: 3.6 },
  { period: "Week 3", qualityScore: 94.2, customerSatisfaction: 4.5, firstCallResolution: 87.3, averageHandleTime: 3.4 },
  { period: "Week 4", qualityScore: 94.8, customerSatisfaction: 4.6, firstCallResolution: 88.7, averageHandleTime: 3.2 },
  { period: "Current", qualityScore: 95.1, customerSatisfaction: 4.7, firstCallResolution: 89.2, averageHandleTime: 3.1 }
];

export default function QualityTrends() {
  const [selectedMetric, setSelectedMetric] = useState("qualityScore");

  const getMetricInfo = (metric: string) => {
    switch (metric) {
      case "qualityScore":
        return { name: "Quality Score", unit: "%", color: "text-blue-600 dark:text-blue-400" };
      case "customerSatisfaction":
        return { name: "Customer Satisfaction", unit: "/5.0", color: "text-green-600 dark:text-green-400" };
      case "firstCallResolution":
        return { name: "First Call Resolution", unit: "%", color: "text-purple-600 dark:text-purple-400" };
      case "averageHandleTime":
        return { name: "Average Handle Time", unit: "min", color: "text-orange-600 dark:text-orange-400" };
      default:
        return { name: "Quality Score", unit: "%", color: "text-blue-600 dark:text-blue-400" };
    }
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />;
    if (current < previous) return <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />;
    return <MinusIcon className="w-4 h-4 text-gray-500" />;
  };

  const getTrendColor = (current: number, previous: number) => {
    if (current > previous) return "text-green-600 dark:text-green-400";
    if (current < previous) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const currentData = mockTrendData[mockTrendData.length - 1];
  const previousData = mockTrendData[mockTrendData.length - 2];
  const currentValue = currentData[selectedMetric as keyof TrendData] as number;
  const previousValue = previousData[selectedMetric as keyof TrendData] as number;
  const change = currentValue - previousValue;
  const changePercent = ((change / previousValue) * 100).toFixed(1);

  const metricInfo = getMetricInfo(selectedMetric);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Quality Trends
            </h3>
          </div>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="qualityScore">Quality Score</option>
            <option value="customerSatisfaction">Customer Satisfaction</option>
            <option value="firstCallResolution">First Call Resolution</option>
            <option value="averageHandleTime">Average Handle Time</option>
          </select>
        </div>
      </div>

      <div className="p-6">
        {/* Current Value Display */}
        <div className="text-center mb-6">
          <div className={`text-4xl font-bold ${metricInfo.color}`}>
            {currentValue}{metricInfo.unit}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {metricInfo.name}
          </div>
          <div className="flex items-center justify-center space-x-1">
            {getTrendIcon(currentValue, previousValue)}
            <span className={`text-sm font-medium ${getTrendColor(currentValue, previousValue)}`}>
              {change > 0 ? "+" : ""}{changePercent}% from last week
            </span>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="mb-6">
          <div className="h-32 flex items-end justify-between space-x-2">
            {mockTrendData.map((data, index) => {
              const value = data[selectedMetric as keyof TrendData] as number;
              const maxValue = Math.max(...mockTrendData.map(d => d[selectedMetric as keyof TrendData] as number));
              const height = (value / maxValue) * 100;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-full rounded-t ${index === mockTrendData.length - 1 ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    style={{ height: `${height}%` }}
                  ></div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    {data.period}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Historical Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="pb-2">Period</th>
                <th className="pb-2 text-right">Quality Score</th>
                <th className="pb-2 text-right">Satisfaction</th>
                <th className="pb-2 text-right">FCR</th>
                <th className="pb-2 text-right">AHT</th>
              </tr>
            </thead>
            <tbody>
              {mockTrendData.map((data, index) => (
                <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-2 text-gray-900 dark:text-white">
                    {data.period}
                  </td>
                  <td className="py-2 text-right text-gray-600 dark:text-gray-300">
                    {data.qualityScore}%
                  </td>
                  <td className="py-2 text-right text-gray-600 dark:text-gray-300">
                    {data.customerSatisfaction}/5.0
                  </td>
                  <td className="py-2 text-right text-gray-600 dark:text-gray-300">
                    {data.firstCallResolution}%
                  </td>
                  <td className="py-2 text-right text-gray-600 dark:text-gray-300">
                    {data.averageHandleTime}min
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {mockTrendData.filter((_, index) => index > 0 && mockTrendData[index][selectedMetric as keyof TrendData] > mockTrendData[index - 1][selectedMetric as keyof TrendData]).length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Improving Weeks</div>
            </div>
            <div>
              <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                {((mockTrendData[mockTrendData.length - 1][selectedMetric as keyof TrendData] as number) - (mockTrendData[0][selectedMetric as keyof TrendData] as number)).toFixed(1)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Change</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
