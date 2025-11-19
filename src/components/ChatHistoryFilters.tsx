"use client";

import React, { useState, useEffect } from "react";
import { useOrganization } from "@/context/OrganizationContext";

interface ChatHistoryFiltersProps {
  onFiltersChange: (filters: any) => void;
}

export default function ChatHistoryFilters({ onFiltersChange }: ChatHistoryFiltersProps) {
  const { currentOrganization } = useOrganization();
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [dateRange, setDateRange] = useState("last_7_days");
  const [status, setStatus] = useState("all");
  const [agentId, setAgentId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchAgents = async () => {
      if (!currentOrganization?.id) return;
      
      try {
        const response = await fetch(`/api/agents?tenant_id=${currentOrganization.id}&type=chat`);
        if (response.ok) {
          const data = await response.json();
          setAgents(data.agents || []);
        }
      } catch (err) {
        console.error('Error fetching agents:', err);
      }
    };

    fetchAgents();
  }, [currentOrganization]);

  useEffect(() => {
    onFiltersChange({
      tenant_id: currentOrganization?.id,
      agent_id: agentId !== 'all' ? agentId : undefined,
      status: status !== 'all' ? status : undefined,
      dateRange,
      searchQuery: searchQuery.trim() || undefined,
    });
  }, [dateRange, status, agentId, searchQuery, currentOrganization?.id, onFiltersChange]);

  return (
    <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800 p-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
        Filter & Search
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Date Range */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date Range
          </label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="last_7_days">Last 7 days</option>
            <option value="last_30_days">Last 30 days</option>
            <option value="last_90_days">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Agent */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Agent
          </label>
          <select
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Agents</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Search
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations, participants..."
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>
      </div>
    </div>
  );
}

