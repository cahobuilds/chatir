"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "./ui/modal";
import Form from "./form/Form";
import Label from "./form/Label";
import TextArea from "./form/input/TextArea";
import Button from "./ui/button/Button";
import Alert from "./ui/alert/Alert";

interface Agent {
  id: string;
  name: string;
  type: "voice" | "chat";
  is_active: boolean;
  configuration?: {
    prompt?: string;
    [key: string]: any;
  };
  retell_agent_id?: string;
}

interface AgentEditModalProps {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AgentEditModal({
  agent,
  isOpen,
  onClose,
  onSuccess,
}: AgentEditModalProps) {
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (agent && isOpen) {
      // Extract prompt from configuration
      const config = agent.configuration || {};
      setPrompt(config.prompt || "");
      setError(null);
      setSuccess(null);
    }
  }, [agent, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!agent) {
      setError("No agent selected");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/agents/${agent.id}/prompt`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (response.ok) {
        setSuccess("Agent prompt updated successfully!");
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to update agent prompt");
      }
    } catch (error: any) {
      console.error("Failed to update agent prompt:", error);
      setError(error.message || "Failed to update agent prompt");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!agent) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Agent: ${agent.name}`}>
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

        <Form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="prompt">Agent Prompt</Label>
              <TextArea
                id="prompt"
                placeholder="Enter the agent's system prompt..."
                rows={12}
                value={prompt}
                onChange={(value: string) => setPrompt(value)}
                disabled={isSubmitting}
                className="font-mono text-sm"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                This prompt defines how the agent behaves and responds to users.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Prompt"}
              </Button>
            </div>
          </div>
        </Form>
      </div>
    </Modal>
  );
}

