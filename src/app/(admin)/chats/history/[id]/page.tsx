"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/context/OrganizationContext";
import {
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { logger } from "@/lib/logger";

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
    chat_id?: string;
    messages?: Array<{
      role?: 'user' | 'assistant' | 'agent' | 'system';
      content?: string;
      tool_calls?: any[];
      timestamp?: number;
      created_at?: number;
    }>;
    start_timestamp?: number;
    end_timestamp?: number;
    chat_status?: string;
    chat_analysis?: {
      chat_successful?: boolean;
      preset_analysis?: any;
      [key: string]: any;
    };
    chat_cost?: number;
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
  const [isStreaming, setIsStreaming] = useState(false);

  // SSE for real-time updates - this replaces the initial fetch
  useEffect(() => {
    if (!params.id || !currentOrganization?.id) {
      setLoading(false);
      return;
    }

    logger.info('Initializing SSE connection', { interactionId: params.id });
    setLoading(true);
    setError(null);

    const eventSource = new EventSource(`/api/interactions/${params.id}/stream`);

    // Handle initial data load
    eventSource.addEventListener('initial', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        logger.info('Received initial interaction data', { 
          interactionId: params.id,
          hasMessages: !!(data.interaction?.retell_chat_data?.messages?.length)
        });
        setInteraction(data.interaction);
        setLoading(false);
      } catch (err) {
        logger.error('Error parsing initial data', err, { interactionId: params.id });
        setError('Failed to load chat details');
        setLoading(false);
      }
    });

    eventSource.addEventListener('connected', (event: any) => {
      logger.sse('connected', params.id as string);
      setIsStreaming(true);
    });

    eventSource.addEventListener('messages', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        logger.sse('messages', params.id as string, { messageCount: data.messageCount });
        setInteraction((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            retell_chat_data: {
              ...prev.retell_chat_data,
              messages: data.messages,
            },
          };
        });
      } catch (err) {
        logger.error('Error parsing messages event', err, { interactionId: params.id });
      }
    });

    eventSource.addEventListener('status', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        setInteraction((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: data.status || data.chat_status || prev.status,
            ended_at: data.ended_at || prev.ended_at,
            retell_chat_data: {
              ...prev.retell_chat_data,
              chat_status: data.chat_status || data.status,
            },
          };
        });
      } catch (err) {
        logger.error('Error parsing status event', err, { interactionId: params.id });
      }
    });

    eventSource.addEventListener('cost', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        setInteraction((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            retell_chat_data: {
              ...prev.retell_chat_data,
              chat_cost: data.cost,
            },
            metadata: {
              ...prev.metadata,
              chat_cost: data.cost,
            },
          };
        });
      } catch (err) {
        logger.error('Error parsing cost event', err, { interactionId: params.id });
      }
    });

    eventSource.addEventListener('analysis', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        setInteraction((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            retell_chat_data: {
              ...prev.retell_chat_data,
              chat_analysis: data.analysis,
            },
            metadata: {
              ...prev.metadata,
              chat_analysis: data.analysis,
            },
          };
        });
      } catch (err) {
        logger.error('Error parsing analysis event', err, { interactionId: params.id });
      }
    });

    eventSource.addEventListener('transcript', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        setInteraction((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            transcript: data.transcript,
          };
        });
      } catch (err) {
        logger.error('Error parsing transcript event', err, { interactionId: params.id });
      }
    });

    eventSource.addEventListener('error', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        logger.error('SSE error event', new Error(data.message || 'Unknown error'), { 
          interactionId: params.id,
          errorData: data
        });
        if (!interaction) {
          setError(data.message || 'Failed to load chat details');
          setLoading(false);
        }
      } catch (err) {
        logger.error('Error parsing error event', err, { interactionId: params.id });
      }
    });

    eventSource.onerror = (error) => {
      logger.error('SSE connection error', error, { interactionId: params.id });
      if (!interaction) {
        setError('Failed to connect to chat stream');
        setLoading(false);
      }
      // Don't close on error - EventSource will auto-reconnect
    };

    return () => {
      logger.info('Closing SSE connection', { interactionId: params.id });
      eventSource.close();
      setIsStreaming(false);
    };
  }, [params.id, currentOrganization?.id]);

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
    { id: "conversation", label: "Conversation", icon: ChatBubbleLeftRightIcon },
    { id: "details", label: "Details", icon: ClipboardDocumentIcon },
    { id: "analytics", label: "Analytics", icon: ChartBarIcon },
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

  const formatMessageTimestamp = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    const dateStr = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    return `${timeStr}, ${dateStr}`;
  };

  const formatCost = (cost: any): string => {
    if (cost === undefined || cost === null) return "N/A";
    const numCost = typeof cost === 'number' ? cost : parseFloat(cost);
    if (isNaN(numCost)) return "N/A";
    return `$${numCost.toFixed(3)}`;
  };

  // Get messages from retell_chat_data or transcript
  const getMessages = () => {
    let rawMessages: any[] = [];
    
    if (interaction.retell_chat_data?.messages && Array.isArray(interaction.retell_chat_data.messages)) {
      rawMessages = interaction.retell_chat_data.messages;
    } else if (interaction.transcript) {
      if (Array.isArray(interaction.transcript)) {
        rawMessages = interaction.transcript;
      } else if (typeof interaction.transcript === 'object') {
        rawMessages = Object.values(interaction.transcript);
      }
    }
    
    // Normalize message format - Retell messages might have different structures
    return rawMessages.map((msg: any) => {
      // Handle different message formats from Retell
      if (typeof msg === 'string') {
        return { role: 'user', content: msg };
      }
      
      // Extract role (could be 'user', 'assistant', 'agent', 'system')
      const role = msg.role || msg.type || 'user';
      
      // Extract content
      const content = msg.content || msg.text || msg.message || JSON.stringify(msg);
      
      // Extract timestamp (could be in ms or seconds)
      let timestamp = msg.timestamp || msg.created_at || msg.time;
      if (timestamp && typeof timestamp === 'string') {
        timestamp = new Date(timestamp).getTime();
      } else if (timestamp && timestamp < 1000000000000) {
        // If timestamp is in seconds, convert to milliseconds
        timestamp = timestamp * 1000;
      }
      
      return {
        role,
        content,
        timestamp,
        tool_calls: msg.tool_calls || msg.tool_calls_array,
      };
    }).sort((a, b) => {
      // Sort by timestamp if available
      if (a.timestamp && b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      return 0;
    });
  };

  const messages = getMessages();
  
  // Get chat analysis data
  const chatAnalysis = interaction.retell_chat_data?.chat_analysis || interaction.metadata?.chat_analysis;
  const chatSuccessful = chatAnalysis?.chat_successful ?? chatAnalysis?.preset_analysis?.chat_successful;
  const chatStatus = interaction.retell_chat_data?.chat_status || interaction.metadata?.chat_status || interaction.status;
  const chatId = interaction.retell_chat_data?.chat_id || interaction.retell_conversation_id || interaction.id;
  const chatCost = interaction.retell_chat_data?.chat_cost || interaction.metadata?.chat_cost;

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
            <div className="flex items-center gap-4 mt-1">
              <p className="text-gray-600 dark:text-gray-400">
                {new Date(interaction.started_at).toLocaleString()}
              </p>
              {chatId && (
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                  Chat ID: {chatId}
                </p>
              )}
              {isStreaming && interaction.status !== 'completed' && (
                <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span>Live updates</span>
                </div>
              )}
            </div>
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
                <tab.icon className="w-4 h-4 mr-2 inline-block" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "conversation" && (
            <div className="space-y-6">
              {/* Conversation Analysis Section */}
              {(chatAnalysis || chatSuccessful !== undefined || chatStatus) && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                    Conversation Analysis
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chatSuccessful !== undefined && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                          Chat Successful
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={chatSuccessful === true}
                            readOnly
                            className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <span className={`text-sm font-medium ${
                            chatSuccessful 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {chatSuccessful ? 'Successful' : 'Unsuccessful'}
                          </span>
                        </div>
                      </div>
                    )}
                    {chatStatus && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                          Chat Status
                        </label>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          chatStatus === 'ended' || chatStatus === 'completed' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : chatStatus === 'error' || chatStatus === 'failed'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                        }`}>
                          {chatStatus === 'ended' ? 'Ended' : 
                           chatStatus === 'ongoing' ? 'Ongoing' :
                           chatStatus === 'error' ? 'Error' :
                           chatStatus.charAt(0).toUpperCase() + chatStatus.slice(1)}
                        </span>
                      </div>
                    )}
                    {chatCost !== undefined && chatCost !== null && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                          Cost
                        </label>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCost(chatCost)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Transcription Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Transcription
                  </h3>
                  {chatId && (
                    <button
                      onClick={() => {
                        window.open(`https://retellai.com/chats/${chatId}`, '_blank');
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                    >
                      View In Playground
                    </button>
                  )}
                </div>
                {messages.length > 0 ? (
                  <div className="space-y-3">
                    {messages.map((message: any, index: number) => {
                      const role = message.role || 'user';
                      const content = message.content || '';
                      const timestamp = message.timestamp;
                      const isUser = role === 'user';
                      const isAgent = role === 'assistant' || role === 'agent' || role === 'system';

                      return (
                        <div
                          key={index}
                          className={`p-3 rounded-lg ${
                            isAgent
                              ? 'bg-indigo-50 dark:bg-indigo-900/20'
                              : 'bg-gray-50 dark:bg-gray-900'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4 mb-1">
                            <span className={`text-xs font-semibold ${
                              isAgent
                                ? 'text-indigo-700 dark:text-indigo-300'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {isAgent ? (interaction.agents?.name || 'Agent') : 'User'}
                            </span>
                            {timestamp && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {formatMessageTimestamp(timestamp)}
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
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <ChatBubbleLeftRightIcon className="w-10 h-10 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No messages available for this conversation
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "details" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Chat ID</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white font-mono break-all">
                    {chatId}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                  <p className="mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      chatStatus === 'ended' || chatStatus === 'completed' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : chatStatus === 'error' || chatStatus === 'failed'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    }`}>
                      {chatStatus === 'ended' ? 'Ended' : 
                       chatStatus === 'ongoing' ? 'Ongoing' :
                       chatStatus === 'error' ? 'Error' :
                       chatStatus}
                    </span>
                  </p>
                </div>
                {chatCost !== undefined && chatCost !== null && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Cost</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {formatCost(chatCost)}
                    </p>
                  </div>
                )}
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
                {chatAnalysis && Object.keys(chatAnalysis).length > 0 && (
                  <div className="col-span-1 md:col-span-2">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Chat Analysis</label>
                    <pre className="mt-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs overflow-auto">
                      {JSON.stringify(chatAnalysis, null, 2)}
                    </pre>
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
            <div className="space-y-6">
              {/* Conversation Analysis */}
              {chatAnalysis && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                    Conversation Analysis
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    {chatSuccessful !== undefined && (
                      <div className="mb-4">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                          Chat Successful
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={chatSuccessful === true}
                            readOnly
                            className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <span className={`text-sm font-medium ${
                            chatSuccessful 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {chatSuccessful ? 'Successful' : 'Unsuccessful'}
                          </span>
                        </div>
                      </div>
                    )}
                    {chatAnalysis.preset_analysis && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                          Preset Analysis
                        </label>
                        <pre className="text-xs bg-white dark:bg-gray-800 p-3 rounded overflow-auto">
                          {JSON.stringify(chatAnalysis.preset_analysis, null, 2)}
                        </pre>
                      </div>
                    )}
                    {Object.keys(chatAnalysis).filter(k => k !== 'preset_analysis' && k !== 'chat_successful').length > 0 && (
                      <div className="mt-4">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                          Additional Analysis Data
                        </label>
                        <pre className="text-xs bg-white dark:bg-gray-800 p-3 rounded overflow-auto">
                          {JSON.stringify(
                            Object.fromEntries(
                              Object.entries(chatAnalysis).filter(([k]) => k !== 'preset_analysis' && k !== 'chat_successful')
                            ),
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Chat Metrics */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                  Chat Metrics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Message Count</label>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {messages.length}
                    </p>
                  </div>
                  {chatCost !== undefined && chatCost !== null && (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Cost</label>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {formatCost(chatCost)}
                      </p>
                    </div>
                  )}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Duration</label>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {formatDuration(interaction.duration)}
                    </p>
                  </div>
                </div>
              </div>

              {!chatAnalysis && (
                <div className="text-center py-12">
                  <ChartBarIcon className="w-10 h-10 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Analytics data will be available here soon
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

