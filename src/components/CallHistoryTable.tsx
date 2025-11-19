"use client";

import React, { useState, useEffect } from "react";
import { useOrganization } from "@/context/OrganizationContext";

interface Interaction {
  id: string;
  tenant_id: string;
  agent_id: string;
  type: 'chat' | 'voice';
  status: 'in_progress' | 'completed' | 'failed';
  retell_call_id: string | null;
  retell_conversation_id: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  duration: number | null;
  transcript: any;
  metadata: any;
  started_at: string;
  ended_at: string | null;
  agents?: {
    name: string;
    type: string;
  };
  tenants?: {
    name: string;
  };
}

interface CallRecord {
  id: string;
  timestamp: string;
  caller: string;
  direction: "inbound" | "outbound";
  duration: string;
  agent: string;
  status: "completed" | "missed" | "failed" | "busy" | "in_progress";
  sentiment: "positive" | "neutral" | "negative";
  hasRecording: boolean;
  hasTranscript: boolean;
  transferred: boolean;
  language: string;
  outcome: string;
}

interface CallHistoryTableProps {
  filters?: {
    tenant_id?: string;
    agent_id?: string;
    status?: string;
    dateRange?: string;
    searchQuery?: string;
  };
  onFiltersChange?: (filters: any) => void;
}

export default function CallHistoryTable({ filters = {}, onFiltersChange }: CallHistoryTableProps) {
  const { currentOrganization } = useOrganization();
  const [selectedCall, setSelectedCall] = useState<string | null>(null);
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);

  // Fetch agents for filter dropdown
  useEffect(() => {
    const fetchAgents = async () => {
      if (!currentOrganization?.id) return;
      
      try {
        const response = await fetch(`/api/agents?tenant_id=${currentOrganization.id}&type=voice`);
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

  // Fetch interactions
  useEffect(() => {
    const fetchInteractions = async () => {
      if (!currentOrganization?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          tenant_id: currentOrganization.id,
          type: 'voice', // Only fetch voice interactions
          limit: pageSize.toString(),
          offset: ((currentPage - 1) * pageSize).toString(),
        });

        if (filters.agent_id && filters.agent_id !== 'all') {
          params.append('agent_id', filters.agent_id);
        }

        if (filters.status && filters.status !== 'all') {
          params.append('status', filters.status);
        }

        const response = await fetch(`/api/interactions?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch interactions');
        }

        const data = await response.json();
        const interactions: Interaction[] = data.interactions || [];
        
        // Map to CallRecord format (already filtered by API)
        const mappedRecords: CallRecord[] = interactions.map((interaction) => {
          const durationSeconds = interaction.duration || 0;
          const minutes = Math.floor(durationSeconds / 60);
          const seconds = durationSeconds % 60;
          const durationStr = `${minutes}m ${seconds}s`;

          // Extract sentiment from metadata if available
          const sentiment = (interaction.metadata?.sentiment || 'neutral') as "positive" | "neutral" | "negative";
          
          // Check if transcript exists
          const hasTranscript = !!interaction.transcript;
          
          // Check if recording exists (from metadata or retell_call_id)
          const hasRecording = !!interaction.retell_call_id;

          return {
            id: interaction.id,
            timestamp: interaction.started_at,
            caller: interaction.customer_phone || 'Unknown',
            direction: "inbound" as const, // Most calls are inbound, could be enhanced
            duration: durationStr,
            agent: interaction.agents?.name || 'Unknown Agent',
            status: interaction.status === 'completed' ? 'completed' : 
                   interaction.status === 'failed' ? 'failed' : 
                   interaction.status === 'in_progress' ? 'in_progress' : 'completed',
            sentiment,
            hasRecording,
            hasTranscript,
            transferred: interaction.metadata?.transferred || false,
            language: interaction.metadata?.language || 'EN',
            outcome: interaction.metadata?.outcome || (interaction.status === 'completed' ? 'Completed' : 'In Progress'),
          };
        });

        setCallRecords(mappedRecords);
        setTotal(data.total || 0);
      } catch (err: any) {
        console.error('Error fetching interactions:', err);
        setError(err.message || 'Failed to load call history');
      } finally {
        setLoading(false);
      }
    };

    fetchInteractions();
  }, [currentOrganization, filters, currentPage, pageSize]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "missed": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "failed": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      case "busy": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "in_progress": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "text-green-600 dark:text-green-400";
      case "neutral": return "text-yellow-600 dark:text-yellow-400";
      case "negative": return "text-red-600 dark:text-red-400";
      default: return "text-gray-600 dark:text-gray-400";
    }
  };

  const getDirectionIcon = (direction: string) => {
    return direction === "inbound" ? "📞" : "📞";
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0m 0s";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const totalPages = Math.ceil(total / pageSize);

  if (loading) {
    return (
      <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800 p-6">
        <div className="text-center py-12">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Call Records
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {total} calls found
            </span>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Call ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Caller
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Agent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Sentiment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {callRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  No call records found
                </td>
              </tr>
            ) : (
              callRecords.map((call) => (
                <tr 
                  key={call.id} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getDirectionIcon(call.direction)}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {call.id.substring(0, 8)}...
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {call.direction}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {new Date(call.timestamp).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(call.timestamp).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {call.caller}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {call.language}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {call.duration}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {call.outcome}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {call.agent}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(call.status)}`}>
                      {call.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm ${getSentimentColor(call.sentiment)}`}>
                        {call.sentiment === 'positive' ? '😊' : call.sentiment === 'neutral' ? '😐' : '😞'}
                      </span>
                      <span className={`text-sm ${getSentimentColor(call.sentiment)}`}>
                        {call.sentiment}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {call.hasRecording && (
                        <span className="text-indigo-600 dark:text-indigo-400" title="Has Recording">
                          🎵
                        </span>
                      )}
                      {call.hasTranscript && (
                        <span className="text-green-600 dark:text-green-400" title="Has Transcript">
                          📝
                        </span>
                      )}
                      {call.transferred && (
                        <span className="text-blue-600 dark:text-blue-400" title="Transferred">🔄</span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/calls/history/${call.id}`, '_blank');
                        }}
                        className="rounded-lg bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                        title="View Details"
                      >
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, total)} of {total} calls
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`rounded px-3 py-2 text-sm ${
                      currentPage === pageNum
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
