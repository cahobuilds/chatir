"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/context/OrganizationContext";
import { createClient } from "@/lib/supabase/client";
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
  retell_call_data?: {
    transcript?: string;
    transcript_object?: Array<{
      role: 'agent' | 'user';
      content: string;
      start: number;
      end: number;
      words?: Array<{
        word: string;
        start: number;
        end: number;
      }>;
    }>;
    transcript_with_tool_calls?: any[];
    recording_url?: string;
    recording_multi_channel_url?: string;
    scrubbed_recording_url?: string;
    call_analysis?: any;
  } | null;
}

export default function CallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { currentOrganization } = useOrganization();
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const supabase = createClient();

  useEffect(() => {
    const fetchInteraction = async () => {
      if (!params.id || !currentOrganization?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/interactions?tenant_id=${currentOrganization.id}&limit=1&offset=0`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch interaction');
        }

        const data = await response.json();
        const interactions: Interaction[] = data.interactions || [];
        const foundInteraction = interactions.find(i => i.id === params.id);

        if (!foundInteraction) {
          // Try fetching directly by ID if not found in list
          const directResponse = await fetch(`/api/interactions/${params.id}`);
          if (directResponse.ok) {
            const directData = await directResponse.json();
            setInteraction(directData.interaction);
          } else {
            throw new Error('Interaction not found');
          }
        } else {
          setInteraction(foundInteraction);
        }
      } catch (err: any) {
        console.error("Error fetching interaction:", err);
        setError(err.message || "Failed to load call details");
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
          <p className="text-gray-600 dark:text-gray-400 mb-4">Call not found</p>
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
    { id: "details", label: "Details", icon: "📋" },
    { id: "transcript", label: "Transcript", icon: "📝" },
    { id: "analytics", label: "Analytics", icon: "📊" },
    { id: "recording", label: "Recording", icon: "🎵" }
  ];

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

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
              Call Details
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {new Date(interaction.started_at).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {interaction.retell_call_data?.recording_url || interaction.retell_call_data?.scrubbed_recording_url ? (
            <button
              onClick={() => {
                const recordingUrl = interaction.retell_call_data?.recording_url || 
                                   interaction.retell_call_data?.scrubbed_recording_url;
                if (recordingUrl) {
                  const link = document.createElement('a');
                  link.href = recordingUrl;
                  link.download = `call-${interaction.retell_call_id || interaction.id}.mp3`;
                  link.target = '_blank';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              }}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download Recording</span>
            </button>
          ) : null}
          {interaction.retell_call_data?.transcript || interaction.transcript ? (
            <button
              onClick={() => {
                const transcript = interaction.retell_call_data?.transcript || interaction.transcript;
                const transcriptText = typeof transcript === 'string' 
                  ? transcript 
                  : JSON.stringify(transcript, null, 2);
                
                const blob = new Blob([transcriptText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `call-transcript-${interaction.retell_call_id || interaction.id}.txt`;
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
          ) : null}
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
          {activeTab === "details" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Call ID</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                    {interaction.retell_call_id || interaction.id}
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
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer Phone</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {interaction.customer_phone || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer Email</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {interaction.customer_email || "N/A"}
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
                    {interaction.ended_at ? new Date(interaction.ended_at).toLocaleString() : "N/A"}
                  </p>
                </div>
              </div>

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

          {activeTab === "transcript" && (
            <div className="space-y-4">
              {(() => {
                // Prefer Retell transcript, fallback to stored transcript
                const transcript = interaction.retell_call_data?.transcript || interaction.transcript;
                const transcriptObject = interaction.retell_call_data?.transcript_object;
                
                if (transcriptObject && Array.isArray(transcriptObject)) {
                  // Format transcript with timestamps
                  return (
                    <div className="space-y-4">
                      {transcriptObject.map((utterance, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg ${
                            utterance.role === 'agent'
                              ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500'
                              : 'bg-gray-50 dark:bg-gray-900 border-l-4 border-gray-400'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-semibold ${
                              utterance.role === 'agent'
                                ? 'text-indigo-700 dark:text-indigo-300'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {utterance.role === 'agent' ? 'Agent' : 'User'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {Math.floor(utterance.start)}s - {Math.floor(utterance.end)}s
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                            {utterance.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                } else if (transcript) {
                  // Plain text transcript
                  return (
                    <div className="prose dark:prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                        {typeof transcript === 'string' 
                          ? transcript 
                          : JSON.stringify(transcript, null, 2)}
                      </pre>
                    </div>
                  );
                } else {
                  return (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-4">📝</div>
                      <p className="text-gray-500 dark:text-gray-400">
                        No transcript available for this call
                      </p>
                    </div>
                  );
                }
              })()}
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

          {activeTab === "recording" && (
            <div className="space-y-4">
              {(() => {
                const recordingUrl = interaction.retell_call_data?.recording_url || 
                                   interaction.retell_call_data?.scrubbed_recording_url ||
                                   interaction.retell_call_data?.recording_multi_channel_url;
                
                if (recordingUrl) {
                  return (
                    <div className="space-y-4">
                      <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
                        <audio
                          controls
                          className="w-full"
                          src={recordingUrl}
                        >
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Recording URL
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-all">
                            {recordingUrl}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = recordingUrl;
                            link.download = `call-${interaction.retell_call_id || interaction.id}.mp3`;
                            link.target = '_blank';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="ml-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span>Download</span>
                        </button>
                      </div>
                      {interaction.retell_call_data?.recording_multi_channel_url && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
                            Multi-channel recording also available
                          </p>
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = interaction.retell_call_data!.recording_multi_channel_url!;
                              link.download = `call-${interaction.retell_call_id || interaction.id}-multichannel.mp3`;
                              link.target = '_blank';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Download Multi-channel Recording
                          </button>
                        </div>
                      )}
                    </div>
                  );
                } else {
                  return (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-4">🎵</div>
                      <p className="text-gray-500 dark:text-gray-400">
                        No recording available for this call
                      </p>
                      {interaction.retell_call_id && (
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                          Recording may still be processing. Please check back later.
                        </p>
                      )}
                    </div>
                  );
                }
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

