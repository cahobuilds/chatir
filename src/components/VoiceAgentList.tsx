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
import TextArea from "./form/input/TextArea";

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
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "voice" as "voice" | "chat",
    is_active: true,
    voice_id: "",
    language: "en-US",
  });

  useEffect(() => {
    fetchAgents();
  }, []);

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
    try {
      // Get user's first tenant (in a real app, you'd have tenant selection)
      const tenantsResponse = await fetch("/api/tenants");
      if (!tenantsResponse.ok) {
        alert("Failed to get tenant information");
        return;
      }
      const tenantsData = await tenantsResponse.json();
      const tenantId = tenantsData.tenants?.[0]?.id || tenantsData[0]?.id;
      
      if (!tenantId) {
        alert("No tenant found. Please create a tenant first.");
        return;
      }

      const url = editingAgent
        ? `/api/agents/${editingAgent.id}`
        : "/api/agents";
      const method = editingAgent ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          name: formData.name,
          type: formData.type,
          is_active: formData.is_active,
          configuration: {
            voice_id: formData.voice_id,
            language: formData.language,
          },
        }),
      });

      if (response.ok) {
        setIsModalOpen(false);
        fetchAgents();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save agent");
      }
    } catch (error) {
      console.error("Failed to save agent:", error);
      alert("Failed to save agent");
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
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="mb-6 flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/[0.05]">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Voice Agents
          </h2>
          <Button onClick={handleCreate} size="sm">
            Create Agent
          </Button>
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
                    className="px-5 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No voice agents found. Create your first agent to get started.
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="p-6">
          <h3 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
            {editingAgent ? "Edit Agent" : "Create Voice Agent"}
          </h3>
          <Form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Agent Name</Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Enter agent name"
                  defaultValue={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
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
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  {editingAgent ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </Form>
        </div>
      </Modal>
    </>
  );
}
