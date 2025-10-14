"use client";

import React from "react";

export default function CallVolumeAnalytics() {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Call Volume Analytics
        </h3>
        <div className="flex items-center space-x-2">
          <select className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
            <option>Last 24 hours</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Chart placeholder */}
      <div className="h-64 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600">
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-4xl">📈</div>
            <p className="text-gray-600 dark:text-gray-300">
              Call Volume Chart
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Interactive chart showing call volume trends
            </p>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Calls</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">1,247</p>
            </div>
            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
              <span className="text-green-600 dark:text-green-400">📞</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-green-600">+15.3% vs yesterday</p>
        </div>
        
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Peak Hour</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">2-3 PM</p>
            </div>
            <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900">
              <span className="text-orange-600 dark:text-orange-400">⏰</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-orange-600">89 calls during peak</p>
        </div>
      </div>
    </div>
  );
}
