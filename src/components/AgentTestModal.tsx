"use client";

import React, { useState, useEffect, useRef } from "react";
import { Modal } from "./ui/modal";
import Button from "./ui/button/Button";
import Input from "./form/input/InputField";
import Label from "./form/Label";
import Alert from "./ui/alert/Alert";
import { MicrophoneIcon, ChatBubbleLeftRightIcon, StopIcon, PhoneIcon } from "@heroicons/react/24/outline";
import { RetellWebClient } from "retell-client-js-sdk";

interface Agent {
  id: string;
  name: string;
  type: "voice" | "chat";
  retell_agent_id?: string;
}

interface AgentTestModalProps {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  type: "user" | "agent";
  text: string;
  timestamp: Date;
  finalized?: boolean;
  isTyping?: boolean;
}

// TypeScript declarations for Web Speech API
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

export default function AgentTestModal({
  agent,
  isOpen,
  onClose,
}: AgentTestModalProps) {
  const [activeTab, setActiveTab] = useState<"voice" | "chat">("voice");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Audio test states
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [useRetellAudio, setUseRetellAudio] = useState(true); // Toggle between Retell and browser TTS
  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const retellClientRef = useRef<RetellWebClient | null>(null);
  const retellCallIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize Web Speech API and Speech Synthesis
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Initialize Speech Recognition
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
            // Clear interim transcription and add final
            setTranscription("");
            const userInput = finalTranscript.trim();
            
            // Only process if we have actual content
            if (userInput.length > 0) {
              // Add user message
              const userMessage: Message = {
                id: Date.now().toString(),
                type: "user",
                text: userInput,
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, userMessage]);
              
              // Call agent API to get real response
              handleAgentVoiceResponse(userInput);
            }
          } else {
            // Update interim transcription (show what's being spoken in real-time)
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
            // Restart if still recording
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error("Failed to restart recognition:", e);
            }
          }
        };
      }

      // Initialize Speech Synthesis
      if ("speechSynthesis" in window) {
        synthesisRef.current = window.speechSynthesis;
        
        // Load voices (some browsers need this)
        if (synthesisRef.current.getVoices().length === 0) {
          synthesisRef.current.addEventListener("voiceschanged", () => {
            // Voices loaded
          });
        }
      }
    }

    return () => {
      if (retellClientRef.current) {
        try {
          retellClientRef.current.stopCall();
        } catch (error) {
          console.error("Error stopping the call on cleanup:", error);
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
      if (synthesisRef.current && currentUtteranceRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, [isRecording]);

  // Reset state when modal opens/closes or agent changes
  useEffect(() => {
    if (isOpen && agent) {
      setActiveTab(agent.type);
      setPhoneNumber("");
      setChatMessage("");
      setChatResponse(null);
      setError(null);
      setSuccess(null);
      setTranscription("");
      setMessages([]);
      setIsRecording(false);
      setIsListening(false);
    } else if (!isOpen) {
      // Clean up when modal closes
      if (retellClientRef.current) {
        try {
          retellClientRef.current.stopCall();
        } catch (error) {
          console.error("Error stopping the call on close:", error);
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

  const handleStartAudioTest = async () => {
    if (!agent) {
      setError("No agent selected");
      return;
    }

    setError(null);
    setSuccess(null);
    setTranscription("");
    setMessages([]);

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Check if agent is linked to Retell and use Retell audio if available
      if (agent.retell_agent_id && useRetellAudio) {
        try {
          // Create web call to get access token
          const webCallResponse = await fetch(`/api/agents/${agent.id}/test/web-call`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });

          if (!webCallResponse.ok) {
            const errorData = await webCallResponse.json();
            const errorMessage = errorData.error || "Failed to create web call";
            const errorDetails = errorData.details ? `\n\nDetails: ${errorData.details}` : "";
            throw new Error(`${errorMessage}${errorDetails}`);
          }

          const { access_token, call_id } = await webCallResponse.json();
          retellCallIdRef.current = call_id;

          // Initialize Retell Web Client
          const retellClient = new RetellWebClient();
          retellClientRef.current = retellClient;

          // Set up event handlers
          retellClient.on("call_started", () => {
            console.log("AI call started - waiting for the engine to be ready...");
            setIsRecording(true);
            setIsListening(true);
            // Don't show success yet - wait for call_ready
          });

          retellClient.on("call_ready", () => {
            console.log("AI call ready - engine connected and audio active");
            setSuccess("Connected to AI Assistant - audio is now active!");
            
            // CRITICAL: Now that engine is ready, unmute the microphone
            // This ensures tracks are only published when the engine can accept them
            try {
              retellClient.unmute();
              console.log("Microphone unmuted - engine is ready to receive audio");
            } catch (unmuteError) {
              console.warn("Could not unmute microphone:", unmuteError);
              // Continue anyway - might already be unmuted
            }
            
            // Audio playback should already be initialized, but ensure it's active
            // This is a safety check for browsers that require it after connection
            try {
              retellClient.startAudioPlayback?.();
            } catch (e) {
              console.warn("Could not start audio playback (may already be started):", e);
            }
            
            // Clear any welcome messages - agent will speak first
            setMessages([]);
          });

          retellClient.on("call_ended", () => {
            console.log("AI call ended");
            console.warn("⚠️ Call ended before call_ready - this may indicate:");
            console.warn("  1. Agent not properly configured");
            console.warn("  2. Agent LLM not configured or invalid");
            console.warn("  3. Access token issue");
            console.warn("  4. Network/connection problem");
            
            setIsRecording(false);
            setIsListening(false);
            
            // Show error to user if call ended before ready
            if (!retellCallIdRef.current) {
              // Call ended immediately - likely a configuration issue
              setError("Call ended immediately. Please check agent configuration in AI Assistant dashboard.");
            }
            
            // Clear refs after a short delay to allow for potential reconnection attempts
            setTimeout(() => {
              retellClientRef.current = null;
              retellCallIdRef.current = null;
            }, 1000);
          });

          retellClient.on("error", (error: any) => {
            console.error("Call error:", error);
            console.error("Error details:", JSON.stringify(error, null, 2));
            
            // Don't fail on PublishTrackError if it's just a timing issue
            // The SDK will retry automatically
            if (error?.message?.includes("PublishTrackError") || 
                error?.message?.includes("publishing rejected")) {
              console.warn("PublishTrackError detected - this may be a timing issue");
              console.warn("The call may still work if the engine connects soon");
              // Don't end the call immediately, give it a chance to recover
              // Only show error if call actually ends
              return;
            }
            
            // For other errors, show to user
            const errorMessage = error?.message || error?.error || "Unknown error";
            setError(`Call error: ${errorMessage}. Check agent configuration in AI Assistant.`);
            setIsRecording(false);
            setIsListening(false);
            
            // Only stop call if it's a critical error
            if (error?.message?.includes("authentication") || 
                error?.message?.includes("unauthorized") ||
                error?.message?.includes("invalid")) {
              retellClient.stopCall();
              retellClientRef.current = null;
              retellCallIdRef.current = null;
            }
          });

          retellClient.on("update", (data: any) => {
            // Handle real-time updates from Retell
            // The update event contains conversation state updates
            console.log("Call update event:", data);
            
            // Handle transcript updates - Retell sends updates with transcript and response fields
            if (data.transcript) {
              setTranscription(data.transcript);
              
              // Add or update user message with transcript
              setMessages((prev) => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage && lastMessage.type === 'user' && !lastMessage.finalized) {
                  // Update existing user message
                  return prev.map((msg, idx) => 
                    idx === prev.length - 1 
                      ? { ...msg, text: data.transcript, finalized: false }
                      : msg
                  );
                } else {
                  // Add new user message
                  return [...prev, {
                    id: `user-${Date.now()}`,
                    type: 'user' as const,
                    text: data.transcript,
                    timestamp: new Date(),
                    finalized: false,
                  }];
                }
              });
            }
            
            // Handle agent response updates
            if (data.response) {
              setMessages((prev) => {
                // Remove any typing indicators
                const withoutTyping = prev.filter(msg => !msg.isTyping);
                const lastMessage = withoutTyping[withoutTyping.length - 1];
                
                if (lastMessage && lastMessage.type === 'agent' && !lastMessage.finalized) {
                  // Update existing agent message
                  return withoutTyping.map((msg, idx) => 
                    idx === withoutTyping.length - 1 
                      ? { ...msg, text: data.response, finalized: true }
                      : msg
                  );
                } else {
                  // Add new agent message
                  return [...withoutTyping, {
                    id: `agent-${Date.now()}`,
                    type: 'agent' as const,
                    text: data.response,
                    timestamp: new Date(),
                    finalized: true,
                  }];
                }
              });
            }
            
            // Finalize any pending user messages when we get a response
            if (data.response) {
              setMessages((prev) => 
                prev.map(msg => 
                  msg.type === 'user' && !msg.finalized 
                    ? { ...msg, finalized: true }
                    : msg
                )
              );
            }
          });

          retellClient.on("agent_start_talking", () => {
            setIsSpeaking(true);
            // Add indicator that agent is speaking
            setMessages((prev) => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage && lastMessage.type === 'agent' && lastMessage.text === '...') {
                return prev; // Already has speaking indicator
              }
              return [...prev, {
                id: `speaking-${Date.now()}`,
                type: 'agent' as const,
                text: '...',
                timestamp: new Date(),
                isTyping: true,
              }];
            });
          });

          retellClient.on("agent_stop_talking", () => {
            setIsSpeaking(false);
            // Remove typing indicator
            setMessages((prev) => prev.filter(msg => !msg.isTyping));
          });

          // Start the call - this will connect to Retell
          // The SDK will automatically enable microphone after connection
          // We need to wait for call_ready before the engine is fully ready
          await retellClient.startCall({
            accessToken: access_token,
          });

          console.log("Call started, waiting for engine to be ready...");
          
          // CRITICAL: Immediately mute the microphone after startCall
          // The SDK enables it automatically, but the engine isn't ready yet
          // We'll unmute it when call_ready fires
          try {
            retellClient.mute();
            console.log("Microphone muted initially - will unmute when engine is ready");
          } catch (muteError) {
            console.warn("Could not mute microphone:", muteError);
            // Continue anyway
          }
          
          // Note: startAudioPlayback() must be called AFTER startCall() 
          // because it requires the room to exist. We'll call it in call_ready handler.

          // Don't add welcome message here - wait for call_ready
          // The agent will speak its first message automatically
          
          return; // Exit early, Retell handles everything
        } catch (retellError: any) {
          console.error("Setup error:", retellError);
          // Fall back to browser-based testing
          setError(`Voice provider audio unavailable: ${retellError.message}. Falling back to browser TTS.`);
          setUseRetellAudio(false);
          // Continue with browser-based approach below
        }
      }

      // Browser-based fallback (original approach)
      // Check if Speech Recognition is available
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setError("Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.");
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      setIsRecording(true);
      setIsListening(true);

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      // Add welcome message from agent
      const welcomeText = `Hi, thank you for calling ${agent.name}! My name is ${agent.name}, your AI agent. I can help you place orders, create support tickets and more. Feel free to interrupt or ask for a live agent at any time. How can I help you?`;
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        type: "agent",
        text: welcomeText,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      
      // Speak the welcome message (browser TTS)
      speakText(welcomeText);
    } catch (error: any) {
      console.error("Microphone access error:", error);
      setError(error.message || "Failed to access microphone. Please allow microphone access.");
      setIsRecording(false);
      setIsListening(false);
    }
  };

  const handleStopAudioTest = () => {
    setIsRecording(false);
    setIsListening(false);

    // Stop Retell call if active
    if (retellClientRef.current) {
      try {
        retellClientRef.current.stopCall();
      } catch (error) {
        console.error("Error stopping the call:", error);
      }
      retellClientRef.current = null;
      retellCallIdRef.current = null;
    }

    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Stop microphone
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Stop any ongoing speech synthesis
    if (synthesisRef.current && currentUtteranceRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const handleAgentVoiceResponse = async (userInput: string) => {
    if (!agent) return;
    
    // Validate input
    if (!userInput || userInput.trim().length === 0) {
      console.warn("Empty user input, skipping API call");
      return;
    }

    // If Retell is active, it handles responses automatically - just add to chat
    if (retellClientRef.current && retellCallIdRef.current) {
      // Retell handles audio automatically, just add user message to chat
      const userMessage: Message = {
        id: Date.now().toString(),
        type: "user",
        text: userInput.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      return;
    }

    // Fallback to API-based response (browser TTS mode)
    try {
      // Call the agent test API
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
        
        // Add agent message to chat
        const agentMessage: Message = {
          id: Date.now().toString(),
          type: "agent",
          text: agentResponse,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, agentMessage]);

        // Convert agent response to speech and play it (browser TTS)
        speakText(agentResponse);
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || "Failed to get agent response";
        setError(errorMessage);
        
        // Still add error message to chat
        const errorMsg: Message = {
          id: Date.now().toString(),
          type: "agent",
          text: `Error: ${errorMessage}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (error: any) {
      console.error("Agent response error:", error);
      const errorMessage = error.message || "Failed to communicate with agent";
      setError(errorMessage);
      
      const errorMsg: Message = {
        id: Date.now().toString(),
        type: "agent",
        text: `Error: ${errorMessage}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      console.warn("Speech synthesis not supported");
      return;
    }

    try {
      // Cancel any ongoing speech
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }

      // Wait a bit for cancellation to complete
      setTimeout(() => {
        try {
          synthesisRef.current = window.speechSynthesis;
          
          // Check if speech synthesis is available
          if (!synthesisRef.current) {
            console.warn("Speech synthesis not available");
            return;
          }

          const utterance = new SpeechSynthesisUtterance(text);
          currentUtteranceRef.current = utterance;

          // Configure voice settings from agent configuration if available
          // Default to a pleasant voice
          utterance.lang = "en-US";
          utterance.rate = 1.0; // Normal speed
          utterance.pitch = 1.0; // Normal pitch
          utterance.volume = 1.0; // Full volume

          // Try to find a good voice (wait for voices to load if needed)
          const getVoices = () => {
            const voices = synthesisRef.current?.getVoices() || [];
            if (voices.length === 0) {
              // Voices not loaded yet, wait for voiceschanged event
              synthesisRef.current?.addEventListener("voiceschanged", () => {
                const loadedVoices = synthesisRef.current?.getVoices() || [];
                const preferredVoice = loadedVoices.find(
                  (voice) => voice.name.includes("Google") || voice.name.includes("Microsoft") || voice.name.includes("Samantha")
                ) || loadedVoices.find((voice) => voice.lang.startsWith("en"));
                if (preferredVoice) {
                  utterance.voice = preferredVoice;
                }
                synthesisRef.current?.speak(utterance);
              }, { once: true });
              return;
            }
            
            const preferredVoice = voices.find(
              (voice) => voice.name.includes("Google") || voice.name.includes("Microsoft") || voice.name.includes("Samantha")
            ) || voices.find((voice) => voice.lang.startsWith("en"));
            
            if (preferredVoice) {
              utterance.voice = preferredVoice;
            }
            
            synthesisRef.current?.speak(utterance);
          };

          utterance.onstart = () => {
            setIsSpeaking(true);
          };

          utterance.onend = () => {
            setIsSpeaking(false);
            currentUtteranceRef.current = null;
          };

          utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
            // "canceled" is expected when we cancel previous speech - don't log as error
            if (event.error !== 'canceled') {
              console.error("Speech synthesis error:", event.error, event);
            }
            setIsSpeaking(false);
            currentUtteranceRef.current = null;
            // Don't show error to user, just log non-canceled errors
          };

          // Get voices and speak
          getVoices();
        } catch (error) {
          console.error("Error setting up speech synthesis:", error);
          setIsSpeaking(false);
        }
      }, 100);
    } catch (error) {
      console.error("Error in speakText:", error);
      setIsSpeaking(false);
    }
  };

  const handleChatTest = async () => {
    if (!agent || !chatMessage.trim()) {
      setError("Message is required");
      return;
    }

    const userMessageText = chatMessage.trim();
    setIsTesting(true);
    setError(null);
    setSuccess(null);
    setChatResponse(null);

    // Add user message to conversation
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      text: userMessageText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Clear input
    const messageToSend = userMessageText;
    setChatMessage("");

    try {
      const response = await fetch(`/api/agents/${agent.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test_type: "chat",
          message: messageToSend,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.success === false) {
          // Handle cases where response is OK but success is false
          const errorMsg = data.response || data.message || data.error || "Test failed";
          setError(errorMsg);
          
          // Add error message to conversation
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: "agent",
            text: `Error: ${errorMsg}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        } else {
          // Success case - add agent response to conversation
          const agentResponseText = data.response || "Test response received";
          setChatResponse(agentResponseText);
          setSuccess("Chat test completed successfully!");
          setTimeout(() => setSuccess(null), 3000);
          
          const agentMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: "agent",
            text: agentResponseText,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, agentMessage]);
        }
      } else {
        // Error response
        const errorMsg = data.response || data.error || data.message || `Failed to test chat agent (${response.status})`;
        setError(errorMsg);
        
        // Add error message to conversation
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "agent",
          text: `Error: ${errorMsg}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        
        // Show specific guidance for common errors
        if (response.status === 422) {
          if (data.requires_publish) {
            setError(`${errorMsg}\n\nPlease publish the agent using the publish button in the agent list.`);
          } else if (data.requires_chat_channel) {
            setError(`${errorMsg}\n\nPlease ensure the agent is configured as a chat agent in the voice provider dashboard.`);
          }
        }
      }
    } catch (error: any) {
      console.error("Chat test error:", error);
      const errorMsg = error.message || "Failed to test chat agent. Please check your connection and try again.";
      setError(errorMsg);
      
      // Add error message to conversation
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "agent",
        text: `Error: ${errorMsg}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTesting(false);
    }
  };

  if (!agent) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Test Agent: ${agent.name}`}
      className="max-w-2xl"
    >
      <div className="px-6 py-4">
        {error && (
          <div className="mb-4">
            <Alert variant="error" title="Error" message={error} />
          </div>
        )}

        {success && (
          <div className="mb-4">
            <Alert variant="success" title="Success" message={success} />
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex border-b border-gray-200 dark:border-gray-700">
          {agent.type === "voice" && (
            <button
              onClick={() => setActiveTab("voice")}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
                activeTab === "voice"
                  ? "border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <MicrophoneIcon className="w-5 h-5" />
              Test Audio
            </button>
          )}
          {agent.type === "chat" && (
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
                activeTab === "chat"
                  ? "border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
              Test Chat
            </button>
          )}
        </div>

        {/* Voice Test Tab */}
        {activeTab === "voice" && agent.type === "voice" && (
          <div className="space-y-6">
            {!isRecording ? (
              <>
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="mb-4 rounded-full bg-indigo-100 p-6 dark:bg-indigo-900/20">
                    <MicrophoneIcon className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                    Test your agent
                  </h3>
                  <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                    Click the button below to start testing with your microphone. Your speech will be transcribed in real-time.
                  </p>
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={handleStartAudioTest}
                    size="sm"
                    variant="primary"
                  >
                    <MicrophoneIcon className="w-4 h-4 mr-2" />
                    Start Audio Test
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Real-time Conversation Interface - Retell Style */}
                <div className="flex flex-col h-[500px] border border-gray-200 rounded-lg dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                  {/* Conversation Header */}
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          isRecording 
                            ? (isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-blue-500 animate-pulse')
                            : 'bg-gray-400'
                        }`}></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {isRecording 
                            ? (isSpeaking ? 'Agent speaking...' : 'Listening...')
                            : 'Ready'
                          }
                        </span>
                      </div>
                      <Button
                        onClick={handleStopAudioTest}
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        End Call
                      </Button>
                    </div>
                  </div>

                  {/* Messages Area - Real-time conversation */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
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
                    
                    {/* Live transcription indicator - shows interim results */}
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
                    {/* Scroll anchor for auto-scroll */}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Chat Test Tab */}
        {activeTab === "chat" && agent.type === "chat" && (
          <div className="space-y-6">
            {!chatResponse && !error && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="mb-4 rounded-full bg-indigo-100 p-6 dark:bg-indigo-900/20">
                  <ChatBubbleLeftRightIcon className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                  Test your agent
                </h3>
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                  Send a message to test the agent's response
                </p>
              </div>
            )}

            {/* Chat Interface - Show conversation-style UI */}
            {(messages.length > 0 || chatMessage) && (
              <div className="flex flex-col h-[400px] border border-gray-200 rounded-lg dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                  {messages.length === 0 && chatMessage && (
                    <div className="flex justify-end items-start gap-3">
                      <div className="max-w-[75%] rounded-2xl rounded-br-sm px-4 py-2.5 bg-indigo-600 text-white shadow-sm">
                        <p className="text-sm whitespace-pre-wrap">{chatMessage}</p>
                      </div>
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                  
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start gap-3 ${
                        message.type === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {message.type === "agent" && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                          <ChatBubbleLeftRightIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                      )}
                      
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                          message.type === "user"
                            ? "bg-indigo-600 text-white rounded-br-sm"
                            : message.text.startsWith("Error:")
                            ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-bl-sm"
                            : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-sm"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                      </div>

                      {message.type === "user" && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}

                  {isTesting && (
                    <div className="flex items-start gap-3 justify-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <ChatBubbleLeftRightIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="max-w-[75%] rounded-2xl rounded-bl-sm px-4 py-2.5 bg-gray-100 dark:bg-gray-700 shadow-sm">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Type your message..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      disabled={isTesting}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleChatTest();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleChatTest}
                      disabled={isTesting || !chatMessage.trim()}
                      size="sm"
                    >
                      {isTesting ? "Sending..." : "Send"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Simple Input View - Show when no conversation yet */}
            {!chatResponse && !error && messages.length === 0 && (
              <>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Input
                    type="text"
                    id="message"
                    placeholder="Enter your test message..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    disabled={isTesting}
                    required
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleChatTest();
                      }
                    }}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleChatTest}
                    disabled={isTesting || !chatMessage.trim()}
                    size="sm"
                  >
                    {isTesting ? "Testing..." : "Test"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

