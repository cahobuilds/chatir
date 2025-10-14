"use client";

import React, { useState } from "react";

export default function CallDetailsPanel() {
  const [activeTab, setActiveTab] = useState("details");

  const tabs = [
    { id: "details", label: "Details", icon: "📋" },
    { id: "transcript", label: "Transcript", icon: "📝" },
    { id: "analytics", label: "Analytics", icon: "📊" },
    { id: "recording", label: "Recording", icon: "🎵" }
  ];

  return (
    <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Call Details
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select a call to view details
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === "details" && (
          <div className="space-y-4">
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📞</div>
              <p className="text-gray-500 dark:text-gray-400">
                Select a call from the table to view details
              </p>
            </div>
          </div>
        )}

        {activeTab === "transcript" && (
          <div className="space-y-4">
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📝</div>
              <p className="text-gray-500 dark:text-gray-400">
                Transcript will appear here when a call is selected
              </p>
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-4">
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-gray-500 dark:text-gray-400">
                Call analytics will appear here when a call is selected
              </p>
            </div>
          </div>
        )}

        {activeTab === "recording" && (
          <div className="space-y-4">
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🎵</div>
              <p className="text-gray-500 dark:text-gray-400">
                Audio player will appear here when a call with recording is selected
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-3">
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700">
            Download Recording
          </button>
          <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
            Export Transcript
          </button>
        </div>
      </div>
    </div>
  );
}
