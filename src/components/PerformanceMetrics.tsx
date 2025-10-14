"use client";

import React from "react";

export default function PerformanceMetrics() {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Performance Metrics
        </h3>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700">
          Export
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Handle Time</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">2m 34s</p>
            </div>
            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
              <span className="text-green-600 dark:text-green-400">⏱️</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-green-600">-12s vs last period</p>
        </div>

        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">First Call Resolution</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">78.5%</p>
            </div>
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
              <span className="text-blue-600 dark:text-blue-400">🎯</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-blue-600">+5.2% vs last period</p>
        </div>

        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Transfer Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">12.3%</p>
            </div>
            <div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900">
              <span className="text-yellow-600 dark:text-yellow-400">🔄</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-yellow-600">+1.2% vs last period</p>
        </div>

        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">SLA Compliance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">94.2%</p>
            </div>
            <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900">
              <span className="text-purple-600 dark:text-purple-400">✅</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-purple-600">+2.1% vs last period</p>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="mt-6 h-48 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-700 dark:to-gray-600">
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-3xl">📊</div>
            <p className="text-gray-600 dark:text-gray-300">
              Performance Trends
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Handle time and resolution rate over time
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
