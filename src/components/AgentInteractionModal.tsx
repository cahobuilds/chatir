"use client";

import React, { useState, useEffect, useRef } from "react";
import { Modal } from "./ui/modal";
import Button from "./ui/button/Button";
import Alert from "./ui/alert/Alert";
import { MicrophoneIcon, StopIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { RetellWebClient } from "retell-client-js-sdk";

interface Agent {
  id: string;
  name: string;
  type: "voice" | "chat";
  retell_agent_id?: string;
  configuration?: any;
  description?: string;
}

interface AgentInteractionModalProps {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  type: "user" | "agent" | "system";
  text: string;
  timestamp: Date;
  finalized?: boolean;
  isTyping?: boolean;
}

interface SpeechRecognitionInterface {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognitionInterface;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognitionInterface;
    };
  }
}

export default function AgentInteractionModal({
  agent,
  isOpen,
  onClose,
}: AgentInteractionModalProps) {
  const [activeTab, setActiveTab] = useState<"voice" | "chat">("voice");
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcription, setTranscription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [agentConfig, setAgentConfig] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationStartTime, setInitializationStartTime] = useState<number | null>(null);
  const [metrics, setMetrics] = useState({
    cost: "$0.00",
    latency: "0ms",
    tokens: "0",
  });

  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const retellClientRef = useRef<RetellWebClient | null>(null);
  const retellCallIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch agent configuration and prompt from Retell when modal opens
  useEffect(() => {
    if (isOpen && agent) {
      fetchAgentConfig();
      if (agent.retell_agent_id) {
        fetchRetellAgentPrompt();
      }
    }
  }, [isOpen, agent]);

  const fetchAgentConfig = async () => {
    if (!agent) return;

    try {
      const response = await fetch(`/api/agents/${agent.id}`);
      if (response.ok) {
        const data = await response.json();
        setAgentConfig(data.agent);
      }
    } catch (error) {
      console.error("Failed to fetch agent config:", error);
    }
  };

  const fetchRetellAgentPrompt = async () => {
    if (!agent?.retell_agent_id) return;

    try {
      // Fetch Retell agent details
      const retellResponse = await fetch(`/api/retell/agents/${agent.id}`);
      if (retellResponse.ok) {
        const retellData = await retellResponse.json();
        const retellAgent = retellData.retell_agent;
        
        // If agent uses Retell LLM, fetch the LLM details to get the prompt
        if (retellAgent?.response_engine?.type === 'retell-llm') {
          const llmId = retellAgent.response_engine.llm_id;
          if (llmId) {
            // Fetch LLM details to get the prompt
            const llmResponse = await fetch(`/api/retell/llms/${llmId}?agent_id=${agent.id}`);
            if (llmResponse.ok) {
              const llmData = await llmResponse.json();
              const prompt = llmData.llm?.general_prompt || llmData.general_prompt;
              if (prompt) {
                setAgentConfig((prev: any) => ({
                  ...prev,
                  retell_prompt: prompt,
                  retell_agent: retellAgent,
                }));
              }
            }
          }
        } else if (retellAgent?.response_engine?.type === 'custom-llm') {
          // For custom LLM, prompt is handled by the websocket endpoint
          // Store the agent details anyway
          setAgentConfig((prev: any) => ({
            ...prev,
            retell_agent: retellAgent,
            retell_prompt: 'Custom LLM - prompt managed by websocket endpoint',
          }));
        }
        
        // Store Retell agent details
        setAgentConfig((prev: any) => ({
          ...prev,
          retell_agent: retellAgent,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch Retell agent prompt:", error);
    }
  };

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognitionRef.current = recognition;

        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + " ";
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            setTranscription("");
            const userInput = finalTranscript.trim();
            if (userInput.length > 0) {
              const userMessage: Message = {
                id: Date.now().toString(),
                type: "user",
                text: userInput,
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, userMessage]);
              handleAgentVoiceResponse(userInput);
            }
          } else {
            setTranscription(interimTranscript);
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setError(`Speech recognition error: ${event.error}`);
          setIsRecording(false);
          setIsListening(false);
        };

        recognition.onend = () => {
          if (isRecording && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error("Failed to restart recognition:", e);
            }
          }
        };
      }
    }

    return () => {
      if (retellClientRef.current) {
        try {
          retellClientRef.current.stopCall();
        } catch (error) {
          console.error("Error stopping Retell call:", error);
        }
        retellClientRef.current = null;
        retellCallIdRef.current = null;
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isRecording]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && agent) {
      setActiveTab(agent.type);
      setError(null);
      setSuccess(null);
      setTranscription("");
      setMessages([]);
      setIsRecording(false);
      setIsListening(false);
    } else if (!isOpen) {
      if (retellClientRef.current) {
        try {
          retellClientRef.current.stopCall();
        } catch (error) {
          console.error("Error stopping Retell call:", error);
        }
        retellClientRef.current = null;
        retellCallIdRef.current = null;
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      setIsRecording(false);
      setIsListening(false);
    }
  }, [isOpen, agent]);

  const handleStartTest = async () => {
    if (!agent) {
      setError("No agent selected");
      return;
    }

    setError(null);
    setSuccess(null);
    setTranscription("");
    setMessages([]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Try Retell first if agent has retell_agent_id
      if (agent.retell_agent_id) {
        try {
          const webCallResponse = await fetch(`/api/agents/${agent.id}/test/web-call`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });

          if (webCallResponse.ok) {
            const { access_token, call_id } = await webCallResponse.json();
            retellCallIdRef.current = call_id;

            const retellClient = new RetellWebClient();
            retellClientRef.current = retellClient;

            retellClient.on("call_started", () => {
              console.log("Retell call started - waiting for engine to initialize...");
              setIsInitializing(true);
              setInitializationStartTime(Date.now());
              setIsRecording(true);
              setIsListening(false); // Don't set listening until call_ready
              
              // Show initialization message
              setMessages([{
                id: 'init',
                type: 'system',
                text: 'Initializing agent... Please wait while the engine connects.',
                timestamp: new Date(),
              }]);
            });

            retellClient.on("call_ready", () => {
              const initTime = initializationStartTime ? Date.now() - initializationStartTime : 0;
              console.log(`Retell call ready - engine connected and audio active (took ${initTime}ms)`);
              setIsInitializing(false);
              setInitializationStartTime(null);
              setSuccess("Connected - audio is active!");
              
              // Add a small delay before unmuting to ensure engine is fully ready
              setTimeout(() => {
                // CRITICAL: Now that engine is ready, unmute the microphone
                // This ensures tracks are only published when the engine can accept them
                try {
                  retellClient.unmute();
                  console.log("Microphone unmuted - engine is ready to receive audio");
                  setIsListening(true);
                } catch (unmuteError) {
                  console.warn("Could not unmute microphone:", unmuteError);
                  // Retry unmuting after a delay
                  setTimeout(() => {
                    try {
                      retellClient.unmute();
                      setIsListening(true);
                    } catch (e) {
                      console.error("Failed to unmute after retry:", e);
                    }
                  }, 1000);
                }
                
                // Audio playback should already be initialized, but ensure it's active
                // This is a safety check for browsers that require it after connection
                try {
                  retellClient.startAudioPlayback?.();
                } catch (e) {
                  console.warn("Could not start audio playback (may already be started):", e);
                }
              }, 500); // Wait 500ms after call_ready before unmuting
              
              // Clear initialization message - agent will speak first
              setMessages([]);
            });

            retellClient.on("call_ended", () => {
              console.log("Retell call ended");
              setIsInitializing(false);
              setInitializationStartTime(null);
              setIsRecording(false);
              setIsListening(false);
              
              // Check if call ended before call_ready (indicates configuration issue)
              if (isInitializing) {
                setError("Call ended during initialization. The agent may need more time to initialize. Please try again.");
              } else if (!retellCallIdRef.current) {
                setError("Call ended immediately. Please check agent configuration in Retell AI dashboard:\n1. Agent LLM must be configured\n2. Agent must have valid API keys\n3. Check Retell dashboard for agent status");
              }
              
              setTimeout(() => {
                retellClientRef.current = null;
                retellCallIdRef.current = null;
              }, 1000);
            });

            retellClient.on("error", (error: any) => {
              console.error("Retell error:", error);
              
              // Handle PublishTrackError gracefully - this is often a timing issue during initialization
              if (error?.message?.includes("PublishTrackError") || 
                  error?.message?.includes("publishing rejected")) {
                console.warn("PublishTrackError detected - engine may not be ready yet");
                console.warn("This is usually a timing issue during initialization. Waiting for call_ready...");
                
                // If we're still initializing, don't show error - wait for call_ready
                if (isInitializing) {
                  console.log("Still initializing - ignoring PublishTrackError, waiting for call_ready");
                  return;
                }
                
                // If not initializing, try to retry unmuting after a delay
                setTimeout(() => {
                  if (retellClientRef.current && retellCallIdRef.current) {
                    try {
                      retellClient.unmute();
                      console.log("Retried unmuting after PublishTrackError");
                    } catch (e) {
                      console.warn("Retry unmute failed:", e);
                    }
                  }
                }, 2000); // Wait 2 seconds before retry
                
                return; // Don't show error to user, let it retry
              }
              
              // For other errors, show to user
              const errorMessage = error?.message || error?.error || "Unknown error";
              
              // Don't show error if we're still initializing (might be transient)
              if (!isInitializing) {
                setError(`Retell error: ${errorMessage}. Check agent configuration in Retell AI dashboard.`);
              }
              
              // Only stop call if it's a critical error
              if (error?.message?.includes("authentication") || 
                  error?.message?.includes("unauthorized") ||
                  error?.message?.includes("invalid")) {
                setIsRecording(false);
                setIsListening(false);
                setIsInitializing(false);
                try {
                  retellClient.stopCall();
                } catch (e) {
                  console.error("Error stopping call:", e);
                }
                retellClientRef.current = null;
                retellCallIdRef.current = null;
              }
            });

            retellClient.on("update", (data: any) => {
              // Handle different data formats from Retell
              // Sometimes data comes as {transcript: "...", response: "..."}
              // Sometimes as {role: "user", content: "..."} or {role: "agent", content: "..."}
              
              let transcript = data.transcript || (data.role === 'user' ? data.content : null);
              let response = data.response || (data.role === 'agent' ? data.content : null);
              
              // Clear initialization message once we get real updates
              if (transcript || response) {
                setIsInitializing(false);
                setMessages((prev) => prev.filter(msg => msg.id !== 'init'));
              }
              
              if (transcript) {
                setTranscription(transcript);
                setMessages((prev) => {
                  const lastMessage = prev[prev.length - 1];
                  if (lastMessage && lastMessage.type === 'user' && !lastMessage.finalized) {
                    return prev.map((msg, idx) => 
                      idx === prev.length - 1 
                        ? { ...msg, text: transcript, finalized: false }
                        : msg
                    );
                  } else {
                    return [...prev, {
                      id: `user-${Date.now()}`,
                      type: 'user' as const,
                      text: transcript,
                      timestamp: new Date(),
                      finalized: false,
                    }];
                  }
                });
              }
              
              if (response) {
                setMessages((prev) => {
                  const withoutTyping = prev.filter(msg => !msg.isTyping && msg.id !== 'init');
                  const lastMessage = withoutTyping[withoutTyping.length - 1];
                  
                  if (lastMessage && lastMessage.type === 'agent' && !lastMessage.finalized) {
                    return withoutTyping.map((msg, idx) => 
                      idx === withoutTyping.length - 1 
                        ? { ...msg, text: response, finalized: true }
                        : msg
                    );
                  } else {
                    return [...withoutTyping, {
                      id: `agent-${Date.now()}`,
                      type: 'agent' as const,
                      text: response,
                      timestamp: new Date(),
                      finalized: true,
                    }];
                  }
                });
              }
            });

            retellClient.on("agent_start_talking", () => {
              setIsSpeaking(true);
            });

            retellClient.on("agent_stop_talking", () => {
              setIsSpeaking(false);
            });

            // Start the call - this will connect to Retell
            await retellClient.startCall({
              accessToken: access_token,
            });

            console.log("Call started, waiting for engine to initialize (this may take up to 2 minutes)...");
            
            // CRITICAL: Immediately mute the microphone after startCall
            // The SDK enables it automatically, but the engine isn't ready yet
            // We'll unmute it when call_ready fires (after a delay to ensure engine is fully ready)
            try {
              retellClient.mute();
              console.log("Microphone muted initially - will unmute when engine is ready");
            } catch (muteError) {
              console.warn("Could not mute microphone:", muteError);
              // Continue anyway - might already be muted or SDK handles it differently
            }
            
            // Set a timeout to show warning if initialization takes too long
            setTimeout(() => {
              if (isInitializing && retellClientRef.current) {
                console.warn("Initialization taking longer than expected - agent may still connect");
                setMessages((prev) => {
                  const hasInitMsg = prev.some(msg => msg.id === 'init');
                  if (hasInitMsg) {
                    return prev.map(msg => 
                      msg.id === 'init' 
                        ? { ...msg, text: 'Initializing agent... This may take up to 2 minutes. Please wait...' }
                        : msg
                    );
                  }
                  return prev;
                });
              }
            }, 30000); // Show warning after 30 seconds
            
            // Set a longer timeout to give up if initialization takes too long (3 minutes)
            setTimeout(() => {
              if (isInitializing && retellClientRef.current) {
                console.error("Initialization timeout - agent failed to initialize after 3 minutes");
                setError("Agent initialization timed out. Please check agent configuration in Retell AI dashboard or try again.");
                setIsInitializing(false);
                setIsRecording(false);
                setIsListening(false);
              }
            }, 180000); // 3 minutes timeout

            return;
          }
        } catch (retellError: any) {
          console.error("Retell setup error:", retellError);
          setError(`Retell unavailable: ${retellError.message}. Using browser TTS.`);
        }
      }

      // Browser-based fallback
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setError("Speech recognition not supported in your browser.");
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      setIsRecording(true);
      setIsListening(true);

      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (error: any) {
      console.error("Microphone access error:", error);
      setError(error.message || "Failed to access microphone.");
      setIsRecording(false);
      setIsListening(false);
    }
  };

  const handleStopTest = () => {
    setIsRecording(false);
    setIsListening(false);

    if (retellClientRef.current) {
      try {
        retellClientRef.current.stopCall();
      } catch (error) {
        console.error("Error stopping Retell call:", error);
      }
      retellClientRef.current = null;
      retellCallIdRef.current = null;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const handleAgentVoiceResponse = async (userInput: string) => {
    if (!agent) return;
    
    if (retellClientRef.current && retellCallIdRef.current) {
      return; // Retell handles automatically
    }

    try {
      const response = await fetch(`/api/agents/${agent.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test_type: "voice",
          message: userInput.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const agentResponse = data.response || data.message || "I'm sorry, I didn't understand that.";
        
        const agentMessage: Message = {
          id: Date.now().toString(),
          type: "agent",
          text: agentResponse,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, agentMessage]);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to get agent response");
      }
    } catch (error: any) {
      console.error("Agent response error:", error);
      setError(error.message || "Failed to communicate with agent");
    }
  };

  // Extract prompt from Retell or local configuration
  const getAgentPrompt = () => {
    // Priority 1: Retell LLM prompt (from Retell API)
    if (agentConfig?.retell_prompt) {
      return agentConfig.retell_prompt;
    }
    
    // Priority 2: Local configuration prompt
    if (agentConfig?.configuration) {
      const config = typeof agentConfig.configuration === 'string' 
        ? JSON.parse(agentConfig.configuration) 
        : agentConfig.configuration;
      
      return config.prompt || 
             config.system_instructions || 
             config.systemPrompt || 
             config.llmConfig?.system_instructions ||
             null;
    }
    
    return "No prompt configured. Fetching from Retell...";
  };

  if (!agent) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${agent.name} - Interaction Test`}
    >
      <div className="flex h-[80vh] overflow-hidden">
        {/* Left Panel - Agent Configuration */}
        <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {agent.name}
              </h2>
              {agent.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {agent.description}
                </p>
              )}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cost</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {metrics.cost}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Latency</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {metrics.latency}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tokens</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {metrics.tokens}
                </div>
              </div>
            </div>

            {/* Agent Prompt */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Agent Prompt
              </h3>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                  {getAgentPrompt()}
                </pre>
              </div>
            </div>

            {/* Configuration Details */}
            {agentConfig?.configuration && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Configuration
                </h3>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(agentConfig.configuration, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Interaction */}
        <div className="w-1/2 flex flex-col bg-white dark:bg-gray-800">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Test Interaction
              </h3>
              <div className="flex items-center gap-2">
                {agent.type === "voice" && (
                  <button
                    onClick={() => setActiveTab("voice")}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === "voice"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <MicrophoneIcon className="w-4 h-4 inline mr-1" />
                    Voice
                  </button>
                )}
                {agent.type === "chat" && (
                  <button
                    onClick={() => setActiveTab("chat")}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === "chat"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <ChatBubbleLeftRightIcon className="w-4 h-4 inline mr-1" />
                    Chat
                  </button>
                )}
              </div>
            </div>

            {error && (
              <Alert variant="error" title="Error" message={error} />
            )}

            {success && (
              <Alert variant="success" title="Success" message={success} />
            )}
          </div>

          {/* Conversation Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            {!isRecording ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="mb-4 rounded-full bg-indigo-100 dark:bg-indigo-900/20 p-8">
                  <MicrophoneIcon className="h-16 w-16 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                  Test your agent
                </h3>
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
                  Click the button below to start testing with your microphone. Your speech will be transcribed in real-time.
                </p>
                <Button
                  onClick={handleStartTest}
                  size="sm"
                  variant="primary"
                >
                  <MicrophoneIcon className="w-4 h-4 mr-2" />
                  Start Test
                </Button>
              </div>
            ) : (
              <>
                {/* Status Bar */}
                <div className="mb-4 flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      isRecording 
                        ? (isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-blue-500 animate-pulse')
                        : 'bg-gray-400'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {isInitializing 
                        ? `Initializing agent... ${initializationStartTime ? `(${Math.floor((Date.now() - initializationStartTime) / 1000)}s)` : ''}`
                        : isRecording 
                          ? (isSpeaking ? 'Agent speaking...' : (isListening ? 'Listening...' : 'Connected'))
                          : 'Ready'
                      }
                    </span>
                  </div>
                  <Button
                    onClick={handleStopTest}
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <StopIcon className="w-4 h-4 mr-1" />
                    End Call
                  </Button>
                </div>

                {/* Messages */}
                <div className="space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <div className="mb-4">
                          <div className="relative w-16 h-16 mx-auto">
                            <div className="absolute inset-0 rounded-full bg-indigo-100 dark:bg-indigo-900/20 animate-ping"></div>
                            <div className="absolute inset-2 rounded-full bg-indigo-200 dark:bg-indigo-800/40"></div>
                            <MicrophoneIcon className="absolute inset-0 m-auto h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                          </div>
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Waiting for conversation to start...
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Speak into your microphone
                        </p>
                      </div>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex items-start gap-3 ${
                          message.type === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {message.type === "agent" && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                              <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                            </svg>
                          </div>
                        )}
                        
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                            message.type === "user"
                              ? "bg-indigo-600 text-white rounded-br-sm"
                              : message.isTyping
                              ? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-bl-sm"
                              : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-sm"
                          }`}
                        >
                          {message.isTyping ? (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                          ) : (
                            <>
                              <p className={`text-sm whitespace-pre-wrap ${
                                message.finalized === false ? 'opacity-70 italic' : ''
                              }`}>
                                {message.text}
                              </p>
                              {message.finalized === false && (
                                <div className="flex items-center gap-1 mt-1">
                                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                                  <span className="text-xs opacity-60">Transcribing...</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {message.type === "user" && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  
                  {/* Live transcription */}
                  {isListening && transcription && !messages.some(m => m.type === 'user' && !m.finalized && m.text === transcription) && (
                    <div className="flex justify-end items-start gap-3">
                      <div className="max-w-[75%] rounded-2xl rounded-br-sm px-4 py-2.5 bg-indigo-100 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 shadow-sm">
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                          {transcription}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Listening...</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

