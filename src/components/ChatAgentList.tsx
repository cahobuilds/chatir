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
import { ArrowPathIcon, PencilIcon, TrashIcon, PlayIcon, CodeBracketIcon, ClipboardDocumentIcon, CloudArrowUpIcon } from "@heroicons/react/24/outline";
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
  // Retell channel information (fetched from Retell API)
  retell_channel?: "chat" | "voice" | null;
  retell_is_published?: boolean | null;
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
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [embeddingAgent, setEmbeddingAgent] = useState<Agent | null>(null);
  const [embedCodeCopied, setEmbedCodeCopied] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkingAgent, setLinkingAgent] = useState<Agent | null>(null);
  const [retellAgentIdInput, setRetellAgentIdInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [publishing, setPublishing] = useState<Record<string, boolean>>({});
  const [publishStatus, setPublishStatus] = useState<Record<string, boolean | null>>({});
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "chat" as "voice" | "chat",
    is_active: true,
    model: "gpt-4",
    language: "en-US",
  });

  useEffect(() => {
    fetchAgents();
  }, [currentOrganization]);

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
        body: JSON.stringify({ 
          tenant_id: currentOrganization.id,
          type: 'chat' // Only sync chat agents
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Sync failed');
      }

      const data = await response.json();
      const createdCount = data.agents?.filter((a: any) => a.action === 'created').length || 0;
      const updatedCount = data.agents?.filter((a: any) => a.action === 'updated').length || 0;
      
      let message = `Successfully synced ${data.synced} agent(s)!`;
      if (createdCount > 0) message += ` ${createdCount} created`;
      if (updatedCount > 0) message += ` ${updatedCount} updated`;
      if (data.errors > 0) message += ` (${data.errors} error(s))`;
      
      setSuccess(message);
      
      // Refresh agents after sync
      await fetchAgents();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error("Sync error:", err);
      setError(err.message || 'Failed to sync agents');
    } finally {
      setSyncing(false);
    }
  };

  const handlePublishAgent = async (agent: Agent) => {
    if (!agent.retell_agent_id) {
      setError("Agent is not linked to Retell AI. Please sync agents first.");
      return;
    }

    try {
      setPublishing(prev => ({ ...prev, [agent.id]: true }));
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/retell/agents/${agent.id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Publish failed');
      }

      const data = await response.json();
      
      // Update publish status
      setPublishStatus(prev => ({ ...prev, [agent.id]: data.is_published }));
      
      if (data.is_published) {
        setSuccess(`Agent "${agent.name}" published successfully!`);
      } else {
        setSuccess(`Publish request sent for "${agent.name}". It may take a few moments to be published.`);
      }
      
      // Refresh agents after publish
      await fetchAgents();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error("Publish error:", err);
      setError(err.message || 'Failed to publish agent');
    } finally {
      setPublishing(prev => ({ ...prev, [agent.id]: false }));
    }
  };

  const handleSearchAgent = async (retellAgentId: string) => {
    try {
      const response = await fetch(`/api/agents/search?retell_agent_id=${retellAgentId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.found) {
          setSuccess(`Found agent: ${data.agents[0].name} (Type: ${data.agents[0].type})`);
          await fetchAgents();
        } else {
          setError(`Agent ${retellAgentId} not found in database. Try syncing agents from Retell.`);
        }
      }
    } catch (err: any) {
      console.error("Search error:", err);
      setError('Failed to search for agent');
    }
  };

  const handleLinkRetellAgent = async (agentId: string, retellAgentId: string) => {
    try {
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/agents/link-retell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agentId,
          retell_agent_id: retellAgentId.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Link failed');
      }

      const data = await response.json();
      setSuccess(data.message || 'Agent linked successfully!');
      
      // Close modal and reset input
      setIsLinkModalOpen(false);
      setLinkingAgent(null);
      setRetellAgentIdInput("");
      
      // Refresh agents to get updated channel info
      await fetchAgents();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error("Link error:", err);
      setError(err.message || 'Failed to link agent');
    }
  };

  const handleOpenLinkModal = (agent: Agent) => {
    setLinkingAgent(agent);
    setRetellAgentIdInput("");
    setError(null);
    setSuccess(null);
    setIsLinkModalOpen(true);
  };

  const fetchAgents = async () => {
    try {
      setLoading(true);
      // Use type filter in API call instead of filtering client-side
      const params = new URLSearchParams({ type: 'chat' });
      
      const response = await fetch(`/api/agents?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const agentsList = data.agents || [];
        
        // Fetch channel and publish status for each agent with retell_agent_id
        const agentsWithChannelInfo = await Promise.all(
          agentsList.map(async (agent: Agent) => {
            if (!agent.retell_agent_id) {
              return agent;
            }
            
            try {
              const retellResponse = await fetch(`/api/retell/agents/${agent.id}`);
              if (retellResponse.ok) {
                const retellData = await retellResponse.json();
                return {
                  ...agent,
                  retell_channel: retellData.channel || null,
                  retell_is_published: retellData.is_published || false,
                };
              }
            } catch (err) {
              console.error(`Failed to fetch channel info for agent ${agent.id}:`, err);
            }
            
            return agent;
          })
        );
        
        setAgents(agentsWithChannelInfo);
        
        // Update publish status from fetched data
        const newPublishStatus: Record<string, boolean> = {};
        agentsWithChannelInfo.forEach((agent: Agent) => {
          if (agent.retell_is_published !== undefined && agent.retell_is_published !== null) {
            newPublishStatus[agent.id] = agent.retell_is_published;
          }
        });
        setPublishStatus(newPublishStatus);
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

  const handleEmbed = (agent: Agent) => {
    setEmbeddingAgent(agent);
    setIsEmbedModalOpen(true);
    setEmbedCodeCopied(false);
  };

  const getEmbedCode = (agent: Agent) => {
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com';
    const scriptUrl = `${baseUrl}/api/widget/chat.js?agent_id=${agent.id}`;
    
    return `<script src="${scriptUrl}"></script>`;
  };

  const copyEmbedCode = async (agent: Agent) => {
    const code = getEmbedCode(agent);
    try {
      await navigator.clipboard.writeText(code);
      setEmbedCodeCopied(true);
      setTimeout(() => setEmbedCodeCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
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
      // Step 1: Create agent locally
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

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Failed to save agent");
        return;
      }

      const data = await response.json();
      const localAgentId = data.agent.id;

      // Step 2: Skip Retell creation - user should create chat agent in Retell dashboard
      // API-created agents default to "voice" channel, so we skip automatic creation
      // User can link manually created chat agent using the "Link Retell Agent" button
      setSuccess("Agent created locally! Next steps: 1) Create a chat agent in Retell dashboard, 2) Use 'Link Retell Agent' button to connect it");
      setTimeout(() => setSuccess(null), 10000);

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

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((agent) =>
        agent.name.toLowerCase().includes(query) ||
        agent.description?.toLowerCase().includes(query) ||
        agent.retell_agent_id?.toLowerCase().includes(query) ||
        agent.id.toLowerCase().includes(query)
      );
    }

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
  }, [agents, statusFilter, sortField, sortDirection, searchQuery]);

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
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2">
              <Label htmlFor="status-filter" className="text-sm">Status:</Label>
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
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Label htmlFor="search" className="text-sm">Search:</Label>
              <Input
                id="search"
                type="text"
                placeholder="Search by name, description, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
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
                        {agent.retell_agent_id && (
                          <>
                            {agent.retell_channel && (
                              <span className={`ml-2 ${agent.retell_channel === 'chat' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                • {agent.retell_channel === 'chat' ? 'Chat' : 'Voice'} Channel
                              </span>
                            )}
                            {publishStatus[agent.id] !== undefined && (
                              <span className={`ml-2 ${publishStatus[agent.id] ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                                • {publishStatus[agent.id] ? 'Published' : 'Not Published'}
                              </span>
                            )}
                          </>
                        )}
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
                        {agent.retell_agent_id ? (
                          <>
                            {agent.retell_channel === 'chat' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePublishAgent(agent)}
                                title={publishStatus[agent.id] ? "Published - Click to republish" : "Publish Agent"}
                                disabled={publishing[agent.id]}
                                className={publishStatus[agent.id] ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : ""}
                              >
                                <CloudArrowUpIcon className={`w-4 h-4 ${publishing[agent.id] ? 'animate-bounce' : ''}`} />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTest(agent)}
                              title={agent.retell_channel === 'voice' ? "Warning: Agent is voice channel, chat test may fail" : "Test Agent"}
                              disabled={agent.retell_channel === 'voice'}
                            >
                              <PlayIcon className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenLinkModal(agent)}
                            title="Link to Retell Agent"
                            className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                          >
                            Link Retell Agent
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEmbed(agent)}
                          title="Get Embed Code"
                        >
                          <CodeBracketIcon className="w-4 h-4" />
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

      {/* Embed Code Modal */}
      <Modal
        isOpen={isEmbedModalOpen}
        onClose={() => {
          setIsEmbedModalOpen(false);
          setEmbeddingAgent(null);
          setEmbedCodeCopied(false);
        }}
        title="Embed Chat Widget"
      >
        {embeddingAgent && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Copy and paste this code into your website to embed the chat widget for <strong>{embeddingAgent.name}</strong>.
              </p>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-2">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Embed Code
                  </label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyEmbedCode(embeddingAgent)}
                    className="flex items-center gap-1"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4" />
                    {embedCodeCopied ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <pre className="text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
                  <code>{getEmbedCode(embeddingAgent)}</code>
                </pre>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                Installation Instructions
              </h4>
              <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
                <li>Copy the embed code above</li>
                <li>Paste it before the closing <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">&lt;/body&gt;</code> tag of your HTML</li>
                <li>The chat widget will appear as a button in the bottom-right corner of your website</li>
                <li>Visitors can click the button to start chatting with your agent</li>
              </ol>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEmbedModalOpen(false);
                  setEmbeddingAgent(null);
                  setEmbedCodeCopied(false);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

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

      {/* Link Retell Agent Modal */}
      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => {
          setIsLinkModalOpen(false);
          setLinkingAgent(null);
          setRetellAgentIdInput("");
          setError(null);
          setSuccess(null);
        }}
        title="Link Retell Agent"
      >
        {linkingAgent && (
          <div className="space-y-4 px-6 py-4">
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

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                Instructions
              </h4>
              <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
                <li>Create a <strong>chat agent</strong> in the Retell dashboard</li>
                <li>Copy the Retell Agent ID (starts with <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">agent_</code>)</li>
                <li>Paste it below and click "Link Agent"</li>
                <li>Publish the agent in Retell dashboard when ready</li>
              </ol>
            </div>

            <div>
              <Label htmlFor="retell-agent-id">Retell Agent ID</Label>
              <Input
                type="text"
                id="retell-agent-id"
                placeholder="agent_xxxxxxxxxxxxx"
                value={retellAgentIdInput}
                onChange={(e) => setRetellAgentIdInput(e.target.value)}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Agent: <strong>{linkingAgent.name}</strong> (Type: {linkingAgent.type})
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setLinkingAgent(null);
                  setRetellAgentIdInput("");
                  setError(null);
                  setSuccess(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!retellAgentIdInput.trim()) {
                    setError("Please enter a Retell Agent ID");
                    return;
                  }
                  handleLinkRetellAgent(linkingAgent.id, retellAgentIdInput.trim());
                }}
                disabled={!retellAgentIdInput.trim()}
              >
                Link Agent
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
