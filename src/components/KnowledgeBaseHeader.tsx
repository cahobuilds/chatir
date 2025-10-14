"use client";

import React, { useState } from "react";

export default function KnowledgeBaseHeader() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Knowledge Base Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Centralized content repository for AI agent training
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
            Sync Sources
          </button>
          <button className="rounded-lg bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700">
            Add Content
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search knowledge base content..."
              className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
          </div>
        </div>
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Categories</option>
            <option value="faq">FAQ</option>
            <option value="policies">Policies</option>
            <option value="procedures">Procedures</option>
            <option value="product-info">Product Information</option>
            <option value="troubleshooting">Troubleshooting</option>
            <option value="training">Training Materials</option>
          </select>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="auto-sync"
            className="rounded border-gray-300"
            defaultChecked
          />
          <label htmlFor="auto-sync" className="text-sm text-gray-700 dark:text-gray-300">
            Auto-sync enabled
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="index-search"
            className="rounded border-gray-300"
            defaultChecked
          />
          <label htmlFor="index-search" className="text-sm text-gray-700 dark:text-gray-300">
            Search indexing active
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Last updated:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">2 hours ago</span>
        </div>
      </div>
    </div>
  );
}
