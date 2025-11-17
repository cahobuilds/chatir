"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "./ui/table";
import Badge from "./ui/badge/Badge";
import Button from "./ui/button/Button";
import { Modal } from "./ui/modal";
import Form from "./form/Form";
import Input from "./form/input/InputField";
import Label from "./form/Label";
import Select from "./form/Select";
import { useOrganization } from "@/context/OrganizationContext";
import Alert from "./ui/alert/Alert";
import TextArea from "./form/input/TextArea";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

interface Agent {
  id: string;
  name: string;
  type: "voice" | "chat";
  is_active: boolean;
  retell_agent_id?: string;
  configuration?: {
    voice_id?: string;
    language?: string;
  };
  created_at: string;
  updated_at: string;
}

export default function VoiceAgentList() {
  const { currentOrganization } = useOrganization();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "voice" as "voice" | "chat",
    is_active: true,
    voice_id: "",
    language: "en-US",
  });

  useEffect(() => {
    fetchAgents();
  }, [currentOrganization]);

  const handleSyncFromRetell = async () => {
    if (!currentOrganization?.id) {
      setError("No organization selected");
      return;
    }

    try {
      setSyncing(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/retell/agents/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenant_id: currentOrganization.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Sync failed');
      }

      const data = await response.json();
      setSuccess(`Successfully synced ${data.synced} agent(s) from Retell AI!${data.errors > 0 ? ` (${data.errors} error(s))` : ''}`);
      
      // Refresh agents after sync
      await fetchAgents();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Sync error:", err);
      setError(err.message || 'Failed to sync agents from Retell AI');
    } finally {
      setSyncing(false);
    }
  };

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/agents");
      if (response.ok) {
        const data = await response.json();
        // API returns { agents: [...] }
        const agentsList = data.agents || data || [];
        // Filter for voice agents only
        const voiceAgents = agentsList.filter((agent: Agent) => agent.type === "voice");
        setAgents(voiceAgents);
      }
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAgent(null);
    setFormData({
      name: "",
      type: "voice",
      is_active: true,
      voice_id: "",
      language: "en-US",
    });
    setIsModalOpen(true);
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      type: agent.type,
      is_active: agent.is_active,
      voice_id: agent.configuration?.voice_id || "",
      language: agent.configuration?.language || "en-US",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this agent?")) return;

    try {
      const response = await fetch(`/api/agents/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchAgents();
      }
    } catch (error) {
      console.error("Failed to delete agent:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentOrganization?.id) {
      setError("No organization selected. Please select an organization first.");
      return;
    }

    if (!formData.name.trim()) {
      setError("Agent name is required");
      return;
    }

    if (!formData.voice_id.trim()) {
      setError("Voice ID is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingAgent
        ? `/api/agents/${editingAgent.id}`
        : "/api/agents";
      const method = editingAgent ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: currentOrganization.id,
          name: formData.name.trim(),
          type: formData.type,
          is_active: formData.is_active,
          configuration: {
            voice_id: formData.voice_id,
            language: formData.language,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(editingAgent ? "Agent updated successfully!" : "Agent created successfully!");
        setIsModalOpen(false);
        await fetchAgents();
        
        // Reset form
        setFormData({
          name: "",
          type: "voice",
          is_active: true,
          voice_id: "",
          language: "en-US",
        });
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to save agent");
      }
    } catch (error: any) {
      console.error("Failed to save agent:", error);
      setError(error.message || "Failed to save agent");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive ? "success" : "error";
  };

  const voiceOptions = [
    { value: "alloy", label: "Alloy" },
    { value: "echo", label: "Echo" },
    { value: "fable", label: "Fable" },
    { value: "onyx", label: "Onyx" },
    { value: "nova", label: "Nova" },
    { value: "shimmer", label: "Shimmer" },
  ];

  const languageOptions = [
    { value: "en-US", label: "English (US)" },
    { value: "en-GB", label: "English (UK)" },
    { value: "es-ES", label: "Spanish" },
    { value: "fr-FR", label: "French" },
    { value: "de-DE", label: "German" },
    { value: "it-IT", label: "Italian" },
  ];

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
        <p className="text-gray-500 dark:text-gray-400">Loading agents...</p>
      </div>
    );
  }

  return (
    <>
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
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="mb-6 flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/[0.05]">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Voice Agents
          </h2>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleSyncFromRetell} 
              size="sm"
              variant="outline"
              disabled={syncing || !currentOrganization?.id}
            >
              <ArrowPathIcon className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? "Syncing..." : "Sync from Retell"}
            </Button>
            <Button onClick={handleCreate} size="sm">
              Create Agent
            </Button>
          </div>
        </div>

        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Agent Name
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Voice & Language
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Status
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Created
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {agents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="px-5 py-8 text-center"
                  >
                    <div className="space-y-3">
                      <p className="text-gray-500 dark:text-gray-400">
                        No voice agents found.
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <Button 
                          onClick={handleSyncFromRetell} 
                          size="sm"
                          variant="outline"
                          disabled={syncing || !currentOrganization?.id}
                        >
                          <ArrowPathIcon className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                          {syncing ? "Syncing..." : "Sync Agents from Retell"}
                        </Button>
                        <span className="text-gray-400 dark:text-gray-500">or</span>
                        <Button onClick={handleCreate} size="sm">
                          Create New Agent
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="px-5 py-4 text-start">
                      <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {agent.name}
                      </span>
                      <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                        ID: {agent.id.slice(0, 8)}...
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start">
                      <span className="block text-gray-800 text-theme-sm dark:text-white/90">
                        {agent.configuration?.voice_id || "Not set"}
                      </span>
                      <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                        {agent.configuration?.language || "Not set"}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start">
                      <Badge
                        size="sm"
                        color={getStatusBadgeColor(agent.is_active)}
                      >
                        {agent.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start text-gray-500 text-theme-sm dark:text-gray-400">
                      {new Date(agent.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(agent)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(agent.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setError(null);
          setSuccess(null);
        }}
        title={editingAgent ? "Edit Voice Agent" : "Create Voice Agent"}
      >
        <div className="px-6 py-4">
          {error && (
            <div className="mb-4">
              <Alert
                variant="error"
                title="Error"
                message={error}
              />
            </div>
          )}

          {success && (
            <div className="mb-4">
              <Alert
                variant="success"
                title="Success"
                message={success}
              />
            </div>
          )}

          <Form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Agent Name</Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Enter agent name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="voice_id">Voice</Label>
                <Select
                  options={voiceOptions}
                  placeholder="Select a voice"
                  defaultValue={formData.voice_id}
                  onChange={(value) =>
                    setFormData({ ...formData, voice_id: value })
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="language">Language</Label>
                <Select
                  options={languageOptions}
                  placeholder="Select a language"
                  defaultValue={formData.language}
                  onChange={(value) =>
                    setFormData({ ...formData, language: value })
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="is_active">Status</Label>
                <Select
                  options={[
                    { value: "true", label: "Active" },
                    { value: "false", label: "Inactive" },
                  ]}
                  placeholder="Select status"
                  defaultValue={formData.is_active ? "true" : "false"}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      is_active: value === "true",
                    })
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setError(null);
                    setSuccess(null);
                    if (!editingAgent) {
                      setFormData({
                        name: "",
                        type: "voice",
                        is_active: true,
                        voice_id: "",
                        language: "en-US",
                      });
                    }
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={isSubmitting || !formData.name.trim() || !formData.voice_id.trim()}
                >
                  {isSubmitting 
                    ? (editingAgent ? "Updating..." : "Creating...") 
                    : (editingAgent ? "Update" : "Create")
                  }
                </Button>
              </div>
            </div>
          </Form>
        </div>
      </Modal>
    </>
  );
}
