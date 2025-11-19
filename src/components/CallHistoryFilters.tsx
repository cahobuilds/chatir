"use client";

import React, { useState, useEffect } from "react";
import { useOrganization } from "@/context/OrganizationContext";

interface CallHistoryFiltersProps {
  onFiltersChange: (filters: {
    tenant_id?: string;
    agent_id?: string;
    status?: string;
    dateRange?: string;
    searchQuery?: string;
  }) => void;
}

export default function CallHistoryFilters({ onFiltersChange }: CallHistoryFiltersProps) {
  const { currentOrganization } = useOrganization();
  const [selectedDateRange, setSelectedDateRange] = useState("last-7-days");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [selectedSentiment, setSelectedSentiment] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // Fetch agents for filter dropdown
  useEffect(() => {
    const fetchAgents = async () => {
      if (!currentOrganization?.id) return;
      
      setLoadingAgents(true);
      try {
        const response = await fetch(`/api/agents?tenant_id=${currentOrganization.id}&type=voice`);
        if (response.ok) {
          const data = await response.json();
          setAgents(data.agents || []);
        }
      } catch (err) {
        console.error('Error fetching agents:', err);
      } finally {
        setLoadingAgents(false);
      }
    };

    fetchAgents();
  }, [currentOrganization]);

  // Notify parent component of filter changes
  useEffect(() => {
    onFiltersChange({
      tenant_id: currentOrganization?.id,
      agent_id: selectedAgent !== 'all' ? selectedAgent : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      dateRange: selectedDateRange,
      searchQuery: searchQuery.trim() || undefined,
    });
  }, [selectedDateRange, selectedStatus, selectedAgent, searchQuery, currentOrganization, onFiltersChange]);

  const handleClearFilters = () => {
    setSelectedDateRange("last-7-days");
    setSelectedStatus("all");
    setSelectedAgent("all");
    setSelectedSentiment("all");
    setSearchQuery("");
  };

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
            <option value="in_progress">In Progress</option>
            <option value="failed">Failed</option>
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
            disabled={loadingAgents}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
          >
            <option value="all">All Agents</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
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
          <button
            onClick={handleClearFilters}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  );
}
