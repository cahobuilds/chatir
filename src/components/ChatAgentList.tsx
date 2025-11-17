"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { useOrganization } from "@/context/OrganizationContext";
import Alert from "./ui/alert/Alert";
import { ArrowPathIcon, PencilIcon, TrashIcon, PlayIcon } from "@heroicons/react/24/outline";
import AgentEditModal from "./AgentEditModal";
import AgentTestModal from "./AgentTestModal";

interface Agent {
  id: string;
  name: string;
  type: "voice" | "chat";
  is_active: boolean;
  description?: string;
  retell_agent_id?: string;
  configuration?: {
    model?: string;
    language?: string;
  };
  created_at: string;
  updated_at: string;
}

type SortField = "name" | "status" | "created_at";
type SortDirection = "asc" | "desc";
type StatusFilter = "all" | "active" | "inactive";

export default function ChatAgentList() {
  const { currentOrganization } = useOrganization();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [testingAgent, setTestingAgent] = useState<Agent | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folders, setFolders] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "chat" as "voice" | "chat",
    is_active: true,
    model: "gpt-4",
    language: "en-US",
  });

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchFolders();
    }
  }, [currentOrganization]);

  useEffect(() => {
    fetchAgents();
  }, [currentOrganization, selectedFolder]);

  const fetchFolders = async () => {
    if (!currentOrganization?.id) return;
    
    try {
      const response = await fetch(`/api/folders?tenant_id=${currentOrganization.id}`);
      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error("Failed to fetch folders:", error);
    }
  };

  const handleSyncAgents = async () => {
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
      setSuccess(`Successfully synced ${data.synced} agent(s)!${data.errors > 0 ? ` (${data.errors} error(s))` : ''}`);
      
      // Refresh agents after sync
      await fetchAgents();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Sync error:", err);
      setError(err.message || 'Failed to sync agents');
    } finally {
      setSyncing(false);
    }
  };

  const fetchAgents = async () => {
    try {
      setLoading(true);
      // Use type filter in API call instead of filtering client-side
      const params = new URLSearchParams({ type: 'chat' });
      if (selectedFolder) {
        params.append('folder_id', selectedFolder);
      }
      
      const response = await fetch(`/api/agents?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        // API already filters by type, so use directly
        setAgents(data.agents || []);
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
      description: "",
      type: "chat",
      is_active: true,
      model: "gpt-4",
      language: "en-US",
    });
    setIsCreateModalOpen(true);
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setIsEditModalOpen(true);
  };

  const handleTest = (agent: Agent) => {
    setTestingAgent(agent);
    setIsTestModalOpen(true);
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

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: currentOrganization.id,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          type: formData.type,
          is_active: formData.is_active,
          configuration: {
            model: formData.model,
            language: formData.language,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess("Agent created successfully!");
        setIsCreateModalOpen(false);
        await fetchAgents();
        
        // Reset form
        setFormData({
          name: "",
          description: "",
          type: "chat",
          is_active: true,
          model: "gpt-4",
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

  // Filter and sort agents
  const filteredAndSortedAgents = useMemo(() => {
    let filtered = [...agents];

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((agent) =>
        statusFilter === "active" ? agent.is_active : !agent.is_active
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "status":
          aValue = a.is_active ? 1 : 0;
          bValue = b.is_active ? 1 : 0;
          break;
        case "created_at":
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [agents, statusFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const modelOptions = [
    { value: "gpt-4", label: "GPT-4" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
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
            Chat Agents
          </h2>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleSyncAgents} 
              size="sm"
              variant="outline"
              disabled={syncing || !currentOrganization?.id}
            >
              <ArrowPathIcon className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? "Syncing..." : "Sync Agents"}
            </Button>
            <Button onClick={handleCreate} size="sm">
              Create Agent
            </Button>
          </div>
        </div>

        {/* Filters and Sorting */}
        <div className="mb-4 flex items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-2">
            <Label htmlFor="folder-filter" className="text-sm">Folder:</Label>
            <Select
              id="folder-filter"
              options={[
                { value: "", label: "All Folders" },
                ...folders.map(f => ({ value: f.id, label: f.name }))
              ]}
              value={selectedFolder || ""}
              onChange={(value) => setSelectedFolder(value || null)}
            />
            <Label htmlFor="status-filter" className="text-sm ml-4">Status:</Label>
            <Select
              id="status-filter"
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as StatusFilter)}
            />
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredAndSortedAgents.length} of {agents.length} agents
          </div>
        </div>

        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => handleSort("name")}
                >
                  Agent Name
                  {sortField === "name" && (
                    <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Description
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Model & Language
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => handleSort("status")}
                >
                  Status
                  {sortField === "status" && (
                    <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => handleSort("created_at")}
                >
                  Created
                  {sortField === "created_at" && (
                    <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
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
              {filteredAndSortedAgents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="px-5 py-8 text-center"
                  >
                    <div className="space-y-3">
                      <p className="text-gray-500 dark:text-gray-400">
                        No chat agents found.
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <Button 
                          onClick={handleSyncAgents} 
                          size="sm"
                          variant="outline"
                          disabled={syncing || !currentOrganization?.id}
                        >
                          <ArrowPathIcon className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                          {syncing ? "Syncing..." : "Sync Agents"}
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
                filteredAndSortedAgents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="px-5 py-4 text-start">
                      <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {agent.name}
                      </span>
                      <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                        ID: {agent.retell_agent_id || agent.id.slice(0, 8)}...
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start text-gray-500 text-theme-sm dark:text-gray-400">
                      {agent.description || "No description"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start">
                      <span className="block text-gray-800 text-theme-sm dark:text-white/90">
                        {agent.configuration?.model || "Not set"}
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
                          onClick={() => handleTest(agent)}
                          title="Test Agent"
                        >
                          <PlayIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(agent)}
                          title="Edit Prompt"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(agent.id)}
                          title="Delete Agent"
                        >
                          <TrashIcon className="w-4 h-4" />
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

      {/* Agent Edit Modal (Prompt Only) */}
      <AgentEditModal
        agent={editingAgent}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingAgent(null);
        }}
        onSuccess={() => {
          fetchAgents();
        }}
      />

      {/* Agent Test Modal */}
      <AgentTestModal
        agent={testingAgent}
        isOpen={isTestModalOpen}
        onClose={() => {
          setIsTestModalOpen(false);
          setTestingAgent(null);
        }}
      />

      {/* Create Agent Modal */}
      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => {
          setIsCreateModalOpen(false);
          setError(null);
          setSuccess(null);
        }}
        title="Create Chat Agent"
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
                <Label htmlFor="description">Description</Label>
                <TextArea
                  placeholder="Enter agent description"
                  rows={3}
                  value={formData.description}
                  onChange={(value: string) =>
                    setFormData({ ...formData, description: value })
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="model">Model</Label>
                <Select
                  options={modelOptions}
                  placeholder="Select a model"
                  defaultValue={formData.model}
                  onChange={(value) =>
                    setFormData({ ...formData, model: value })
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
                    setIsCreateModalOpen(false);
                    setError(null);
                    setSuccess(null);
                    setFormData({
                      name: "",
                      description: "",
                      type: "chat",
                      is_active: true,
                      model: "gpt-4",
                      language: "en-US",
                    });
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={isSubmitting || !formData.name.trim()}
                >
                  {isSubmitting 
                    ? "Creating..." 
                    : "Create"
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
