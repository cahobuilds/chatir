"use client";

import React, { useState } from "react";

export default function CallHistoryFilters() {
  const [selectedDateRange, setSelectedDateRange] = useState("last-7-days");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [selectedSentiment, setSelectedSentiment] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Filter & Search
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date Range
          </label>
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last-7-days">Last 7 days</option>
            <option value="last-30-days">Last 30 days</option>
            <option value="custom">Custom range</option>
          </select>
        </div>

        {/* Call Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Call Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="answered">Answered</option>
            <option value="missed">Missed</option>
            <option value="busy">Busy</option>
            <option value="failed">Failed</option>
            <option value="no-answer">No Answer</option>
          </select>
        </div>

        {/* Agent Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Agent
          </label>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Agents</option>
            <option value="alpha">AI Agent Alpha</option>
            <option value="beta">AI Agent Beta</option>
            <option value="gamma">AI Agent Gamma</option>
            <option value="delta">AI Agent Delta</option>
          </select>
        </div>

        {/* Sentiment Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sentiment
          </label>
          <select
            value={selectedSentiment}
            onChange={(e) => setSelectedSentiment(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Sentiment</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
        </div>

        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Search
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search calls, phone numbers..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="has-recording"
              className="rounded border-gray-300"
            />
            <label htmlFor="has-recording" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Has Recording
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="has-transcript"
              className="rounded border-gray-300"
            />
            <label htmlFor="has-transcript" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Has Transcript
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="transferred"
              className="rounded border-gray-300"
            />
            <label htmlFor="transferred" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Transferred
            </label>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
            Clear Filters
          </button>
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700">
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
