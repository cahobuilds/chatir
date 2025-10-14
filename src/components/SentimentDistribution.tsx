"use client";

import React from "react";

export default function SentimentDistribution() {
  const sentimentData = [
    { label: "Positive", value: 65, color: "bg-green-500" },
    { label: "Neutral", value: 25, color: "bg-yellow-500" },
    { label: "Negative", value: 10, color: "bg-red-500" }
  ];

  const total = sentimentData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Sentiment Distribution
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Last 24 hours
        </p>
      </div>

      {/* Sentiment Chart */}
      <div className="mb-6">
        <div className="h-32 rounded-lg bg-gradient-to-r from-green-100 via-yellow-100 to-red-100 dark:from-green-900 dark:via-yellow-900 dark:to-red-900">
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-2 text-3xl">😊</div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Overall Sentiment
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {((sentimentData[0].value / total) * 100).toFixed(0)}% Positive
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sentiment Breakdown */}
      <div className="space-y-3">
        {sentimentData.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`h-3 w-3 rounded-full ${item.color}`}></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {item.label}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-20 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div 
                  className={`h-2 rounded-full ${item.color}`}
                  style={{ width: `${(item.value / total) * 100}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white w-8">
                {item.value}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Key Insights */}
      <div className="mt-6 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
        <div className="flex items-center space-x-2">
          <span className="text-green-600 dark:text-green-400">📈</span>
          <p className="text-sm text-green-700 dark:text-green-300">
            Sentiment improved by 12% compared to yesterday
          </p>
        </div>
      </div>
    </div>
  );
}
