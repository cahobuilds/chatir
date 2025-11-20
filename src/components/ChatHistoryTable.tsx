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
  created_at: string;
  agents?: {
    name: string;
    type: string;
  };
  tenants?: {
    name: string;
  };
}

interface ChatRecord {
  id: string;
  timestamp: string;
  participant: string;
  duration: string;
  agent: string;
  status: "completed" | "failed" | "in_progress";
  messageCount: number;
  hasTranscript: boolean;
}

interface ChatHistoryTableProps {
  filters?: {
    tenant_id?: string;
    agent_id?: string;
    status?: string;
    dateRange?: string;
    searchQuery?: string;
  };
}

export default function ChatHistoryTable({ filters = {} }: ChatHistoryTableProps) {
  const { currentOrganization } = useOrganization();
  const [chatRecords, setChatRecords] = useState<ChatRecord[]>([]);
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
          type: 'chat', // Only fetch chat interactions
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
          throw new Error('Failed to fetch chat history');
        }

        const data = await response.json();
        const interactions: Interaction[] = data.interactions || [];
        setTotal(data.total || 0);
        
        // Map to ChatRecord format
        const mappedRecords: ChatRecord[] = interactions.map((interaction) => {
          const durationSeconds = interaction.duration || 0;
          const minutes = Math.floor(durationSeconds / 60);
          const seconds = durationSeconds % 60;
          const durationStr = durationSeconds > 0 ? `${minutes}m ${seconds}s` : 'N/A';

          // Extract message count from transcript or metadata
          let messageCount = 0;
          if (interaction.transcript) {
            if (Array.isArray(interaction.transcript)) {
              messageCount = interaction.transcript.length;
            } else if (typeof interaction.transcript === 'object') {
              messageCount = Object.keys(interaction.transcript).length;
            }
          }
          if (interaction.metadata?.message_count) {
            messageCount = interaction.metadata.message_count;
          }

          // Get participant identifier
          const participant = interaction.customer_email || interaction.customer_phone || 'Anonymous';

          return {
            id: interaction.id,
            timestamp: interaction.started_at,
            participant: participant,
            duration: durationStr,
            agent: interaction.agents?.name || "Unknown Agent",
            status: interaction.status === 'completed' ? 'completed' : 
                    interaction.status === 'failed' ? 'failed' : 'in_progress',
            messageCount: messageCount,
            hasTranscript: !!interaction.transcript,
          };
        });
        setChatRecords(mappedRecords);
      } catch (err: any) {
        console.error("Error fetching chat history:", err);
        setError(err.message || "Failed to load chat history");
      } finally {
        setLoading(false);
      }
    };

    fetchInteractions();
  }, [currentOrganization, filters, currentPage, pageSize]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "failed": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "in_progress": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
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
            Chat Conversations
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {total} conversations found
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Chat ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Participant
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Agent
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Messages
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {chatRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                  No chat conversations found
                </td>
              </tr>
            ) : (
              chatRecords.map((chat) => (
                <tr 
                  key={chat.id} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                      {chat.id.substring(0, 8)}...
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {new Date(chat.timestamp).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(chat.timestamp).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {chat.participant}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {chat.duration}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900 dark:text-white line-clamp-2 break-words max-w-[250px]">
                      {chat.agent}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {chat.messageCount}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(chat.status)}`}>
                      {chat.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `/chats/history/${chat.id}`;
                        }}
                        className="rounded-lg bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 whitespace-nowrap"
                        title="View Details"
                      >
                        Details
                      </button>
                      {chat.hasTranscript && (
                        <span className="text-green-600 dark:text-green-400" title="Has Transcript">
                          📝
                        </span>
                      )}
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
                Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, total)} of {total} conversations
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

