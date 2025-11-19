"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/context/OrganizationContext";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

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
  retell_chat_data?: {
    messages?: Array<{
      role?: 'user' | 'assistant' | 'agent' | 'system';
      content?: string;
      tool_calls?: any[];
      timestamp?: number;
    }>;
    start_timestamp?: number;
    end_timestamp?: number;
    chat_status?: string;
    collected_dynamic_variables?: any;
    metadata?: any;
    agent_id?: string;
  } | null;
}

export default function ChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { currentOrganization } = useOrganization();
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("conversation");

  useEffect(() => {
    const fetchInteraction = async () => {
      if (!params.id || !currentOrganization?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/interactions/${params.id}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch chat conversation');
        }

        const data = await response.json();
        setInteraction(data.interaction);
      } catch (err: any) {
        console.error("Error fetching chat conversation:", err);
        setError(err.message || "Failed to load chat details");
      } finally {
        setLoading(false);
      }
    };

    fetchInteraction();
  }, [params.id, currentOrganization]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!interaction) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Chat conversation not found</p>
          <button
            onClick={() => router.back()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "conversation", label: "Conversation", icon: "💬" },
    { id: "details", label: "Details", icon: "📋" },
    { id: "analytics", label: "Analytics", icon: "📊" },
  ];

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString();
  };

  // Get messages from retell_chat_data or transcript
  const getMessages = () => {
    if (interaction.retell_chat_data?.messages && Array.isArray(interaction.retell_chat_data.messages)) {
      return interaction.retell_chat_data.messages;
    }
    // Fallback to transcript if available
    if (interaction.transcript) {
      if (Array.isArray(interaction.transcript)) {
        return interaction.transcript;
      }
      if (typeof interaction.transcript === 'object') {
        // Try to extract messages from transcript object
        return Object.values(interaction.transcript);
      }
    }
    return [];
  };

  const messages = getMessages();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Chat Conversation Details
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {new Date(interaction.started_at).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {messages.length > 0 && (
            <button
              onClick={() => {
                const transcriptText = messages.map((msg: any, idx: number) => {
                  const role = msg.role || 'user';
                  const content = msg.content || JSON.stringify(msg);
                  return `${role === 'user' || role === 'assistant' ? role.toUpperCase() : 'AGENT'}: ${content}`;
                }).join('\n\n');
                
                const blob = new Blob([transcriptText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `chat-transcript-${interaction.retell_conversation_id || interaction.id}.txt`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export Transcript</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
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
          {activeTab === "conversation" && (
            <div className="space-y-4">
              {messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message: any, index: number) => {
                    const role = message.role || 'user';
                    const content = message.content || JSON.stringify(message);
                    const timestamp = message.timestamp || message.created_at;
                    const isUser = role === 'user';
                    const isAgent = role === 'assistant' || role === 'agent';

                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-lg ${
                          isAgent
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500'
                            : 'bg-gray-50 dark:bg-gray-900 border-l-4 border-gray-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-semibold ${
                            isAgent
                              ? 'text-indigo-700 dark:text-indigo-300'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {isAgent ? (interaction.agents?.name || 'Agent') : 'User'}
                          </span>
                          {timestamp && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatTimestamp(typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime())}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                          {content}
                        </p>
                        {message.tool_calls && message.tool_calls.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tool Calls:</p>
                            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
                              {JSON.stringify(message.tool_calls, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">💬</div>
                  <p className="text-gray-500 dark:text-gray-400">
                    No messages available for this conversation
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "details" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Chat ID</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                    {interaction.retell_conversation_id || interaction.id}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                  <p className="mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      interaction.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                      interaction.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    }`}>
                      {interaction.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Agent</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {interaction.agents?.name || "Unknown"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Duration</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {formatDuration(interaction.duration)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer Email</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {interaction.customer_email || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer Phone</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {interaction.customer_phone || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Started At</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {new Date(interaction.started_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Ended At</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {interaction.ended_at ? new Date(interaction.ended_at).toLocaleString() : 
                     interaction.retell_chat_data?.end_timestamp ? formatTimestamp(interaction.retell_chat_data.end_timestamp) :
                     "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Message Count</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {messages.length}
                  </p>
                </div>
                {interaction.retell_chat_data?.chat_status && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Chat Status</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {interaction.retell_chat_data.chat_status}
                    </p>
                  </div>
                )}
              </div>

              {interaction.retell_chat_data?.collected_dynamic_variables && 
               Object.keys(interaction.retell_chat_data.collected_dynamic_variables).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Collected Variables</label>
                  <pre className="mt-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs overflow-auto">
                    {JSON.stringify(interaction.retell_chat_data.collected_dynamic_variables, null, 2)}
                  </pre>
                </div>
              )}

              {interaction.metadata && Object.keys(interaction.metadata).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Metadata</label>
                  <pre className="mt-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs overflow-auto">
                    {JSON.stringify(interaction.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-4">
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📊</div>
                <p className="text-gray-500 dark:text-gray-400">
                  Analytics data will be available here soon
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

