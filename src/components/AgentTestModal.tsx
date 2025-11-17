"use client";

import React, { useState } from "react";
import { Modal } from "./ui/modal";
import Button from "./ui/button/Button";
import Input from "./form/input/InputField";
import Label from "./form/Label";
import Alert from "./ui/alert/Alert";
import { MicrophoneIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

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

  // Reset state when modal opens/closes or agent changes
  React.useEffect(() => {
    if (isOpen && agent) {
      setActiveTab(agent.type);
      setPhoneNumber("");
      setChatMessage("");
      setChatResponse(null);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, agent]);

  const handleVoiceTest = async () => {
    if (!agent || !phoneNumber) {
      setError("Phone number is required");
      return;
    }

    setIsTesting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/agents/${agent.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test_type: "voice",
          phone_number: phoneNumber,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`Test call initiated! Call ID: ${data.call_id}`);
        setTimeout(() => setSuccess(null), 5000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to initiate test call");
      }
    } catch (error: any) {
      console.error("Test call error:", error);
      setError(error.message || "Failed to initiate test call");
    } finally {
      setIsTesting(false);
    }
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
            <div className="flex flex-col items-center justify-center py-8">
              <div className="mb-4 rounded-full bg-indigo-100 p-6 dark:bg-indigo-900/20">
                <MicrophoneIcon className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                Test your agent
              </h3>
              <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                Enter your phone number to receive a test call
              </p>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                type="tel"
                id="phone"
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isTesting}
                required
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Enter your phone number in E.164 format (e.g., +1234567890)
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleVoiceTest}
                disabled={isTesting || !phoneNumber.trim()}
                size="sm"
              >
                {isTesting ? "Initiating..." : "Test"}
              </Button>
            </div>
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

