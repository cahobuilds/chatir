"use client";

import React, { useState, useEffect } from "react";
import KnowledgeBaseSidebar, { type KnowledgeBase } from "@/components/KnowledgeBaseSidebar";
import KnowledgeBaseDetail from "@/components/KnowledgeBaseDetail";
import AddKnowledgeBaseModal from "@/components/AddKnowledgeBaseModal";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/context/OrganizationContext";

export default function KnowledgeBasePage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKb, setSelectedKb] = useState<KnowledgeBase | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Set page title
  useEffect(() => {
    document.title = "Knowledge Base Management | AI Customer Care - TinAdmin";
  }, []);


  // Fetch knowledge bases from API
  useEffect(() => {
    fetchKnowledgeBases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSelect = (kb: KnowledgeBase) => {
    setSelectedKb(kb);
  };

  const handleAddNew = () => {
    setIsAddModalOpen(true);
  };

  const handleSaveNew = async (name: string, type: "notion" | "web" | "file" | "text") => {
    if (!currentOrganization?.id) {
      setError("No organization selected. Please select an organization.");
      return;
    }

    try {
      const response = await fetch("/api/knowledge-bases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenant_id: currentOrganization.id,
          name,
          type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create knowledge base");
      }

      const data = await response.json();
      const newKb: KnowledgeBase = {
        id: data.knowledge_base.id,
        name: data.knowledge_base.name,
        type: data.knowledge_base.type as "notion" | "web" | "file" | "text",
        pageCount: data.knowledge_base.page_count || 0,
        status: data.knowledge_base.status as "synced" | "syncing" | "error" | undefined,
      };

      setKnowledgeBases([...knowledgeBases, newKb]);
      setSelectedKb(newKb);
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error("Error creating knowledge base:", err);
      setError(err.message || "Failed to create knowledge base");
    }
  };

  const handleEdit = () => {
    // TODO: Open edit modal
    console.log("Edit knowledge base:", selectedKb?.id);
  };

  const handleSync = async () => {
    if (!currentOrganization?.id) {
      setError("No organization selected. Please select an organization.");
      return;
    }

    try {
      setSyncing(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/retell/knowledge-bases/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tenant_id: currentOrganization.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Sync failed');
      }

      const data = await response.json();
      const createdCount = data.created || 0;
      const updatedCount = data.updated || 0;
      const errorsCount = data.errors || 0;
      
      let message = `Successfully synced ${data.synced || 0} knowledge base(s)!`;
      if (createdCount > 0) message += ` ${createdCount} created`;
      if (updatedCount > 0) message += ` ${updatedCount} updated`;
      if (errorsCount > 0) message += ` (${errorsCount} error(s))`;
      
      setSuccess(message);
      
      // Refresh knowledge bases list
      await fetchKnowledgeBases();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error("Sync error:", err);
      setError(err.message || 'Failed to sync knowledge bases from Retell');
    } finally {
      setSyncing(false);
    }
  };

  const fetchKnowledgeBases = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/knowledge-bases");
      if (!response.ok) {
        throw new Error(`Failed to fetch knowledge bases: ${response.statusText}`);
      }
      
      const data = await response.json();
      const kbList: KnowledgeBase[] = (data.knowledge_bases || []).map((kb: any) => ({
        id: kb.id,
        name: kb.name,
        type: kb.type as "notion" | "web" | "file" | "text",
        pageCount: kb.page_count || 0,
        lastSynced: kb.last_synced_at 
          ? new Date(kb.last_synced_at).toLocaleDateString() 
          : undefined,
        status: kb.status as "synced" | "syncing" | "error" | undefined,
      }));
      
      setKnowledgeBases(kbList);
      
      // Preserve selected knowledge base if it still exists, otherwise select first
      if (selectedKb) {
        const stillExists = kbList.find(kb => kb.id === selectedKb.id);
        if (stillExists) {
          // Update the selected KB with latest data
          setSelectedKb(stillExists);
        } else if (kbList.length > 0) {
          // Selected KB was deleted, select first one
          setSelectedKb(kbList[0]);
        } else {
          // No knowledge bases left
          setSelectedKb(null);
        }
      } else if (kbList.length > 0) {
        // No selection yet, select first
        setSelectedKb(kbList[0]);
      }
    } catch (err: any) {
      console.error("Error fetching knowledge bases:", err);
      setError(err.message || "Failed to load knowledge bases");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedKb) return;
    if (!confirm(`Are you sure you want to delete "${selectedKb.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/knowledge-bases/${selectedKb.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete knowledge base");
      }

      const updatedList = knowledgeBases.filter((kb) => kb.id !== selectedKb.id);
      setKnowledgeBases(updatedList);
      setSelectedKb(updatedList.length > 0 ? updatedList[0] : null);
    } catch (err: any) {
      console.error("Error deleting knowledge base:", err);
      setError(err.message || "Failed to delete knowledge base");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-12rem)] -mx-4 md:-mx-6 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading knowledge bases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] -mx-4 md:-mx-6 overflow-hidden">
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 rounded-lg p-4 z-50 max-w-md">
          <p className="text-red-800 dark:text-red-200 font-semibold">Error:</p>
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="fixed top-4 right-4 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-800 rounded-lg p-4 z-50 max-w-md">
          <p className="text-green-800 dark:text-green-200 font-semibold">Success:</p>
          <p className="text-green-700 dark:text-green-300">{success}</p>
          <button
            onClick={() => setSuccess(null)}
            className="mt-2 text-sm text-green-600 dark:text-green-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Left Sidebar */}
      <KnowledgeBaseSidebar
        knowledgeBases={knowledgeBases}
        selectedId={selectedKb?.id || null}
        onSelect={handleSelect}
        onAddNew={handleAddNew}
        onSync={handleSync}
        syncing={syncing}
      />

      {/* Right Content Area */}
      <KnowledgeBaseDetail
        knowledgeBase={selectedKb}
        onEdit={handleEdit}
        onSync={handleSync}
        onDelete={handleDelete}
        onRefresh={fetchKnowledgeBases}
      />

      {/* Add Knowledge Base Modal */}
      <AddKnowledgeBaseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveNew}
      />
    </div>
  );
}
