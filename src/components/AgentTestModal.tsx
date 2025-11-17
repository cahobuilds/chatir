"use client";

import React, { useState, useEffect, useRef } from "react";
import { Modal } from "./ui/modal";
import Button from "./ui/button/Button";
import Input from "./form/input/InputField";
import Label from "./form/Label";
import Alert from "./ui/alert/Alert";
import { MicrophoneIcon, ChatBubbleLeftRightIcon, StopIcon, PhoneIcon } from "@heroicons/react/24/outline";

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
  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

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
      
      // Speak the welcome message
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

    try {
      // Call the agent test API
      const response = await fetch(`/api/agents/${agent.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test_type: "voice",
          message: userInput,
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

        // Convert agent response to speech and play it
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

    // Cancel any ongoing speech
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
    }

    synthesisRef.current = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    currentUtteranceRef.current = utterance;

    // Configure voice settings from agent configuration if available
    // Default to a pleasant voice
    utterance.lang = "en-US";
    utterance.rate = 1.0; // Normal speed
    utterance.pitch = 1.0; // Normal pitch
    utterance.volume = 1.0; // Full volume

    // Try to find a good voice
    const voices = synthesisRef.current.getVoices();
    const preferredVoice = voices.find(
      (voice) => voice.name.includes("Google") || voice.name.includes("Microsoft") || voice.name.includes("Samantha")
    ) || voices.find((voice) => voice.lang.startsWith("en"));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      currentUtteranceRef.current = null;
    };

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      setIsSpeaking(false);
      currentUtteranceRef.current = null;
    };

    // Speak the text
    synthesisRef.current.speak(utterance);
  };

  const handleChatTest = async () => {
    if (!agent || !chatMessage.trim()) {
      setError("Message is required");
      return;
    }

    setIsTesting(true);
    setError(null);
    setSuccess(null);
    setChatResponse(null);

    try {
      const response = await fetch(`/api/agents/${agent.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test_type: "chat",
          message: chatMessage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setChatResponse(data.response || "Test response received");
        setSuccess("Chat test completed successfully!");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to test chat agent");
      }
    } catch (error: any) {
      console.error("Chat test error:", error);
      setError(error.message || "Failed to test chat agent");
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
                {/* Chat Interface */}
                <div className="flex flex-col h-[400px] border border-gray-200 rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                        <div className="text-center">
                          <MicrophoneIcon className="h-8 w-8 mx-auto mb-2 text-indigo-600 dark:text-indigo-400" />
                          <p>Listening... Speak into your microphone</p>
                        </div>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.type === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-4 py-2 ${
                              message.type === "user"
                                ? "bg-indigo-600 text-white"
                                : "bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                            <p className="text-xs mt-1 opacity-70">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    
                    {/* Live transcription indicator */}
                    {isListening && transcription && (
                      <div className="flex justify-end">
                        <div className="max-w-[80%] rounded-lg px-4 py-2 bg-indigo-100 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                          <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                            {transcription}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Listening...</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status Indicators */}
                  <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center justify-center gap-4">
                      {isListening && (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                          <span className="text-sm text-red-700 dark:text-red-400 font-medium">
                            Recording...
                          </span>
                        </div>
                      )}
                      {isSpeaking && (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                          <span className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                            Speaking...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* End Call Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleStopAudioTest}
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <StopIcon className="w-4 h-4 mr-2" />
                    End the Call
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Chat Test Tab */}
        {activeTab === "chat" && agent.type === "chat" && (
          <div className="space-y-6">
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

            {chatResponse && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <Label>Agent Response</Label>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  {chatResponse}
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleChatTest}
                disabled={isTesting || !chatMessage.trim()}
                size="sm"
              >
                {isTesting ? "Testing..." : "Test"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

