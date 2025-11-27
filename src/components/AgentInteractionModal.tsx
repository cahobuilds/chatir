"use client";

import React, { useState, useEffect, useRef } from "react";
import { Modal } from "./ui/modal";
import Button from "./ui/button/Button";
import Alert from "./ui/alert/Alert";
import { MicrophoneIcon, StopIcon, ChatBubbleLeftRightIcon, PencilIcon } from "@heroicons/react/24/outline";
import { RetellWebClient } from "retell-client-js-sdk";
import { useOrganization } from "@/context/OrganizationContext";
import { usePermissions } from "@/hooks/usePermissions";

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

// Helper function to extract clean text from transcript/response data
function extractCleanText(data: any): string {
  if (!data) return '';
  
  // If it's already a string, return it (but check if it's JSON)
  if (typeof data === 'string') {
    // Check if it looks like JSON (starts with [ or {)
    if (data.trim().startsWith('[') || data.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(data);
        return extractCleanText(parsed);
      } catch {
        // Not valid JSON, return as is
        return data;
      }
    }
    return data;
  }
  
  // If it's an array, extract messages
  if (Array.isArray(data)) {
    const messages: string[] = [];
    for (const item of data) {
      if (typeof item === 'string') {
        messages.push(item);
      } else if (item && typeof item === 'object') {
        // Extract content/role/text fields
        const text = item.content || item.text || item.message || item.transcript;
        const role = item.role || item.type;
        if (text && typeof text === 'string') {
          messages.push(text);
        } else if (role && text) {
          messages.push(`${text}`);
        }
      }
    }
    return messages.join('\n');
  }
  
  // If it's an object, try to extract text fields
  if (typeof data === 'object') {
    return data.content || data.text || data.message || data.transcript || JSON.stringify(data, null, 2);
  }
  
  return String(data);
}

// Helper function to obfuscate Retell mentions
function obfuscateRetell(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/retell/gi, 'voice-platform')
    .replace(/Retell/gi, 'Voice Platform')
    .replace(/RETELL/gi, 'VOICE PLATFORM');
}

// Helper function to sanitize configuration JSON
function sanitizeConfiguration(config: any): any {
  if (!config || typeof config !== 'object') return config;
  
  const sanitized = JSON.parse(JSON.stringify(config));
  
  // Recursively sanitize object
  function sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Obfuscate Retell-related keys
        let newKey = key;
        if (key.toLowerCase().includes('retell')) {
          newKey = key.replace(/retell/gi, 'voice-platform').replace(/Retell/gi, 'VoicePlatform');
        }
        
        if (value && typeof value === 'object') {
          result[newKey] = sanitizeObject(value);
        } else if (typeof value === 'string') {
          result[newKey] = obfuscateRetell(value);
        } else {
          result[newKey] = value;
        }
      }
      return result;
    }
    if (typeof obj === 'string') {
      return obfuscateRetell(obj);
    }
    return obj;
  }
  
  return sanitizeObject(sanitized);
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
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState("");
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const retellClientRef = useRef<RetellWebClient | null>(null);
  const retellCallIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isInitializingRef = useRef(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Get organization context and permissions
  const { currentOrganization } = useOrganization();
  const { roleInfo } = usePermissions(currentOrganization?.id || null);

  // Check if user is admin
  useEffect(() => {
    if (roleInfo) {
      const adminRoles = ['organization_admin', 'tenant_admin', 'super_admin'];
      setIsAdmin(adminRoles.includes(roleInfo.role));
      setUserRole(roleInfo.role);
    }
  }, [roleInfo]);

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

    // Only cleanup on unmount, NOT when isRecording changes
    // This was causing calls to end prematurely when call_started fired
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []); // Empty dependency array - only run once on mount

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
      // Cleanup when modal closes
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
      setIsRecording(false);
      setIsListening(false);
    }
  }, [isOpen, agent]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (retellClientRef.current) {
        try {
          retellClientRef.current.stopCall();
        } catch (error) {
          console.error("Error stopping Retell call on unmount:", error);
        }
        retellClientRef.current = null;
        retellCallIdRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []); // Only run on unmount

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
      // Try Retell first if agent has retell_agent_id
      if (agent.retell_agent_id) {
        try {
          // EXACT PATTERN FROM WORKING TEST PAGE
          console.log("Requesting web call from API...");
          const webCallResponse = await fetch(`/api/agents/${agent.id}/test/web-call`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });

          if (!webCallResponse.ok) {
            const errorData = await webCallResponse.json();
            throw new Error(errorData.error || `API error: ${webCallResponse.status}`);
          }

          const { access_token, call_id } = await webCallResponse.json();
          retellCallIdRef.current = call_id;
          console.log(`Web call created: ${call_id}`);
          console.log(`Access token received (length: ${access_token.length})`);

          // Request microphone access BEFORE creating client (matches test page exactly)
          console.log("Requesting microphone access...");
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = stream;
          console.log("Microphone access granted");

          // Create Retell client
          const retellClient = new RetellWebClient();
          retellClientRef.current = retellClient;

          // Set up ALL event listeners BEFORE startCall (matches test page exactly)
          retellClient.on("call_started", () => {
            console.log("✅ call_started event fired");
            setIsInitializing(true);
            isInitializingRef.current = true;
            setInitializationStartTime(Date.now());
            setIsRecording(true);
            setIsListening(false);
            setMessages([{
              id: 'init',
              type: 'agent' as const,
              text: 'Initializing agent... Please wait while the engine connects.',
              timestamp: new Date(),
            }]);
          });

          retellClient.on("call_ready", () => {
            const initTime = initializationStartTime ? Date.now() - initializationStartTime : 0;
            console.log(`✅✅ call_ready event fired - ENGINE IS READY! (took ${initTime}ms)`);
            setIsInitializing(false);
            isInitializingRef.current = false;
            setInitializationStartTime(null);
            setSuccess("Connected - audio is active!");
            setIsListening(true);
            setMessages([]);
          });

          retellClient.on("call_ended", (data: any) => {
            console.log(`❌ call_ended event fired: ${JSON.stringify(data)}`);
            const wasInitializing = isInitializingRef.current;
            const duration = initializationStartTime 
              ? Math.floor((Date.now() - initializationStartTime) / 1000)
              : 0;
            
            setIsInitializing(false);
            isInitializingRef.current = false;
            setInitializationStartTime(null);
            setIsRecording(false);
            setIsListening(false);
            
            if (wasInitializing) {
              setError(`Call ended during initialization after ${duration}s. Check Retell dashboard for call ${retellCallIdRef.current}`);
            }
            
            setTimeout(() => {
              retellClientRef.current = null;
              retellCallIdRef.current = null;
            }, 1000);
          });

          retellClient.on("error", (error: any) => {
            console.error(`❌ ERROR event: ${error?.message || JSON.stringify(error)}`);
            // Only show critical errors
            if (error?.message?.includes("authentication") || 
                error?.message?.includes("unauthorized") ||
                error?.message?.includes("invalid")) {
              setError(`Retell error: ${error?.message || 'Unknown error'}`);
              setIsRecording(false);
              setIsListening(false);
              setIsInitializing(false);
              isInitializingRef.current = false;
            }
          });

          retellClient.on("update", (data: any) => {
            setIsInitializing(false);
            isInitializingRef.current = false;

            const parseTranscriptArray = (source: any): any[] => {
              if (!source) return [];
              if (Array.isArray(source)) return source;
              if (typeof source === "string") {
                try {
                  const parsed = JSON.parse(source);
                  return Array.isArray(parsed) ? parsed : [];
                } catch (err) {
                  console.warn("Failed to parse transcript_object:", err);
                }
              }
              if (typeof source === "object" && source !== null) {
                return [source];
              }
              return [];
            };

            const transcriptArray = parseTranscriptArray(data.transcript_object);

            if (transcriptArray.length > 0) {
              const finalMessages = new Map<string, Message>();
              let latestUserDraft: Message | null = null;
              let latestAgentDraft: Message | null = null;

              transcriptArray.forEach((item: any, index: number) => {
                const role = (item.role || item.type || "user").toLowerCase();
                const content = extractCleanText(item.content || item.text || item.message || "");
                if (!content || !content.trim()) return;

                const messageType: Message["type"] =
                  role === "agent" || role === "assistant"
                    ? "agent"
                    : role === "system"
                    ? "agent"
                    : "user";

                const baseId =
                  item.utterance_id ||
                  item.segment_id ||
                  item.message_id ||
                  item.sequence_id ||
                  (typeof item.start === "number"
                    ? `${messageType}-start-${Math.round(item.start * 1000)}`
                    : `${messageType}-idx-${index}`);

                const isFinal =
                  item.final === true ||
                  item.finalized === true ||
                  item.status === "final" ||
                  item.completion === "done";

                const message: Message = {
                  id: String(baseId),
                  type: messageType,
                  text: content.trim(),
                  timestamp: new Date(
                    typeof item.start === "number" ? item.start * 1000 : Date.now()
                  ),
                  finalized: !!isFinal,
                };

                if (message.finalized) {
                  finalMessages.set(message.id, message);
                } else if (messageType === "user") {
                  latestUserDraft = message;
                } else if (messageType === "agent") {
                  latestAgentDraft = message;
                }
              });

              const orderedMessages = Array.from(finalMessages.values()).sort(
                (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
              );

              if (latestUserDraft) {
                const userDraft: Message = latestUserDraft;
                orderedMessages.push({
                  id: userDraft.id,
                  type: userDraft.type,
                  text: userDraft.text,
                  timestamp: userDraft.timestamp,
                  finalized: false,
                });
              }
              if (latestAgentDraft) {
                const agentDraft: Message = latestAgentDraft;
                orderedMessages.push({
                  id: agentDraft.id,
                  type: agentDraft.type,
                  text: agentDraft.text,
                  timestamp: agentDraft.timestamp,
                  finalized: false,
                });
              }

              setMessages(orderedMessages);

              let currentUserDraftText = "";
              for (let i = orderedMessages.length - 1; i >= 0; i--) {
                const msg = orderedMessages[i];
                if (msg.type === "user" && msg.finalized === false) {
                  currentUserDraftText = msg.text;
                  break;
                }
              }

              setTranscription(currentUserDraftText);
              return;
            }

            // Fallback: simple transcript/response payloads
            let transcript: string | null = null;
            let response: string | null = null;

            if (data.transcript) {
              const cleanText = extractCleanText(data.transcript);
              transcript = cleanText.trim() || null;
            }

            if (data.response) {
              const cleanText = extractCleanText(data.response);
              response = cleanText.trim() || null;
            }

            if (transcript || response) {
              setMessages((prev) => prev.filter((msg) => msg.id !== "init"));
            }

            if (transcript) {
              const trimmed = transcript.trim();
              setTranscription(trimmed);
              setMessages((prev) => {
                const updated = prev.map((msg) =>
                  msg.type === "user" && !msg.finalized
                    ? { ...msg, text: trimmed, finalized: true }
                    : msg
                );
                if (updated.some((msg) => msg.type === "user" && msg.text === trimmed)) {
                  return updated;
                }
                return [
                  ...updated,
                  {
                    id: `user-${Date.now()}`,
                    type: "user",
                    text: trimmed,
                    timestamp: new Date(),
                    finalized: true,
                  },
                ];
              });
            }

            if (response) {
              const trimmed = response.trim();
              setMessages((prev) => {
                const updated = prev.map((msg) =>
                  msg.type === "agent" && !msg.finalized
                    ? { ...msg, text: trimmed, finalized: true }
                    : msg
                );
                if (updated.some((msg) => msg.type === "agent" && msg.text === trimmed)) {
                  return updated;
                }
                return [
                  ...updated,
                  {
                    id: `agent-${Date.now()}`,
                    type: "agent",
                    text: trimmed,
                    timestamp: new Date(),
                    finalized: true,
                  },
                ];
              });
            }
          });

          retellClient.on("agent_start_talking", () => {
            console.log("🎤 Agent started talking");
            setIsSpeaking(true);
          });

          retellClient.on("agent_stop_talking", () => {
            console.log("🔇 Agent stopped talking");
            setIsSpeaking(false);
          });

          // Handle interim transcript updates - show live transcription without creating bubbles
          retellClient.on("transcript", (data: any) => {
            // This handles interim (live) transcription
            // Show in transcription state, not as a message bubble
            if (data.transcript) {
              const cleanText = extractCleanText(data.transcript);
              if (cleanText && cleanText.trim()) {
                setTranscription(cleanText.trim());
              }
            }
          });

          // Start the call - NO MUTING, let SDK handle everything (matches test page exactly)
          console.log("Starting Retell call...");
          await retellClient.startCall({
            accessToken: access_token,
          });

          console.log("startCall() completed - waiting for events...");

          return;
        } catch (retellError: any) {
          console.error("Retell setup error:", retellError);
          setError(`Retell unavailable: ${retellError.message}. Using browser TTS.`);
        }
      }

      // Browser-based fallback
      // For browser fallback, we need microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

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
    setSuccess(null);
    setTranscription("");

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

  // Extract prompt from configuration - obfuscate Retell mentions
  const getAgentPrompt = () => {
    let prompt: string | null = null;
    
    // Priority 1: Voice Platform LLM prompt (from API)
    if (agentConfig?.retell_prompt) {
      prompt = agentConfig.retell_prompt;
    }
    
    // Priority 2: Local configuration prompt
    if (!prompt && agentConfig?.configuration) {
      const config = typeof agentConfig.configuration === 'string' 
        ? JSON.parse(agentConfig.configuration) 
        : agentConfig.configuration;
      
      prompt = config.prompt || 
             config.system_instructions || 
             config.systemPrompt || 
             config.llmConfig?.system_instructions ||
             null;
    }
    
    // Obfuscate Retell mentions in prompt
    if (prompt) {
      return obfuscateRetell(prompt);
    }
    
    return "No prompt configured. Fetching from voice platform...";
  };

  // Initialize edited prompt when prompt changes
  useEffect(() => {
    if (agentConfig && !isEditingPrompt) {
      // Get original prompt without obfuscation for editing
      let originalPrompt = "";
      
      if (agentConfig.retell_prompt) {
        originalPrompt = agentConfig.retell_prompt;
      } else if (agentConfig.configuration) {
        const config = typeof agentConfig.configuration === 'string' 
          ? JSON.parse(agentConfig.configuration) 
          : agentConfig.configuration;
        originalPrompt = config.prompt || 
                        config.system_instructions || 
                        config.systemPrompt || 
                        config.llmConfig?.system_instructions ||
                        "";
      }
      
      setEditedPrompt(originalPrompt);
    }
  }, [agentConfig, isEditingPrompt]);

  // Handler to start editing prompt
  const handleStartEditPrompt = () => {
    // Get original prompt without obfuscation
    let originalPrompt = "";
    
    if (agentConfig?.retell_prompt) {
      originalPrompt = agentConfig.retell_prompt;
    } else if (agentConfig?.configuration) {
      const config = typeof agentConfig.configuration === 'string' 
        ? JSON.parse(agentConfig.configuration) 
        : agentConfig.configuration;
      originalPrompt = config.prompt || 
                      config.system_instructions || 
                      config.systemPrompt || 
                      config.llmConfig?.system_instructions ||
                      "";
    }
    
    setEditedPrompt(originalPrompt);
    setIsEditingPrompt(true);
  };

  // Handler to cancel editing
  const handleCancelEditPrompt = () => {
    setIsEditingPrompt(false);
    setError(null);
  };

  // Handler to save prompt
  const handleSavePrompt = async () => {
    if (!agent) return;

    setIsSavingPrompt(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/agents/${agent.id}/prompt`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: editedPrompt,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Prompt updated successfully and synced to voice platform');
        setIsEditingPrompt(false);
        
        // Refresh agent config to get updated prompt
        await fetchAgentConfig();
        if (agent.retell_agent_id) {
          await fetchRetellAgentPrompt();
        }
      } else {
        setError(data.error || 'Failed to update prompt');
      }
    } catch (error: any) {
      console.error('Failed to save prompt:', error);
      setError(error.message || 'Failed to update prompt');
    } finally {
      setIsSavingPrompt(false);
    }
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
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Agent Prompt
              </h3>
                {isAdmin && !isEditingPrompt && (
                  <Button
                    onClick={handleStartEditPrompt}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <PencilIcon className="h-4 w-4" />
                    Edit
                  </Button>
                )}
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                {isEditingPrompt ? (
                  <div className="space-y-3">
                    <textarea
                      value={editedPrompt}
                      onChange={(e) => setEditedPrompt(e.target.value)}
                      className="w-full min-h-[300px] p-3 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md font-mono whitespace-pre-wrap resize-y"
                      placeholder="Enter agent prompt..."
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={handleCancelEditPrompt}
                        variant="outline"
                        size="sm"
                        disabled={isSavingPrompt}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSavePrompt}
                        variant="primary"
                        size="sm"
                        disabled={isSavingPrompt || !editedPrompt.trim()}
                      >
                        {isSavingPrompt ? 'Saving...' : 'Save & Sync'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {getAgentPrompt()}
                  </div>
                )}
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
                    {JSON.stringify(sanitizeConfiguration(agentConfig.configuration), null, 2)}
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
                                {extractCleanText(message.text)}
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

