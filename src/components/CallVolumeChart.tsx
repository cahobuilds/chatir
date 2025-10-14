"use client";

import React from "react";

export default function CallVolumeChart() {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Call Volume Trends
        </h3>
        <div className="flex items-center space-x-4">
          <select className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
            <option>Last 24 hours</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700">
            Export
          </button>
        </div>
      </div>

      {/* Chart placeholder */}
      <div className="h-64 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-700 dark:to-gray-600">
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-4xl">📊</div>
            <p className="text-gray-600 dark:text-gray-300">
              Call Volume Chart
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Interactive chart showing call volume over time
            </p>
          </div>
        </div>
      </div>

      {/* Chart metrics */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            1,247
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total Calls Today
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            89.3%
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Answer Rate
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            2m 15s
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Avg Duration
          </p>
        </div>
      </div>
    </div>
  );
}
