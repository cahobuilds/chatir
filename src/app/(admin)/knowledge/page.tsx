"use client";

import React, { useState, useEffect } from "react";
import KnowledgeBaseSidebar, { type KnowledgeBase } from "@/components/KnowledgeBaseSidebar";
import KnowledgeBaseDetail from "@/components/KnowledgeBaseDetail";
import AddKnowledgeBaseModal from "@/components/AddKnowledgeBaseModal";
import { useAuth } from "@/hooks/useAuth";

export default function KnowledgeBasePage() {
  const { user } = useAuth();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKb, setSelectedKb] = useState<KnowledgeBase | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);

  // Set page title
  useEffect(() => {
    document.title = "Knowledge Base Management | AI Customer Care - TinAdmin";
  }, []);

  // Get current tenant ID from profile
  useEffect(() => {
    const fetchTenantId = async () => {
      if (!user) return;
      
      try {
        const response = await fetch("/api/profile");
        if (response.ok) {
          const data = await response.json();
          if (data.profile?.tenants && data.profile.tenants.length > 0) {
            // Use the first active tenant
            setCurrentTenantId(data.profile.tenants[0].tenant_id || data.profile.tenants[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch tenant ID:", err);
      }
    };
    fetchTenantId();
  }, [user]);

  // Fetch knowledge bases from API
  useEffect(() => {
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
        // Only set selected if we don't have one already
        if (kbList.length > 0 && !selectedKb) {
          setSelectedKb(kbList[0]);
        }
      } catch (err: any) {
        console.error("Error fetching knowledge bases:", err);
        setError(err.message || "Failed to load knowledge bases");
      } finally {
        setLoading(false);
      }
    };

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
    if (!currentTenantId) {
      setError("No tenant selected. Please select an organization.");
      return;
    }

    try {
      const response = await fetch("/api/knowledge-bases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenant_id: currentTenantId,
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

  const handleSync = () => {
    // TODO: Trigger sync
    console.log("Sync knowledge base:", selectedKb?.id);
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
        <div className="fixed top-4 right-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 rounded-lg p-4 z-50">
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

      {/* Left Sidebar */}
      <KnowledgeBaseSidebar
        knowledgeBases={knowledgeBases}
        selectedId={selectedKb?.id || null}
        onSelect={handleSelect}
        onAddNew={handleAddNew}
      />

      {/* Right Content Area */}
      <KnowledgeBaseDetail
        knowledgeBase={selectedKb}
        onEdit={handleEdit}
        onSync={handleSync}
        onDelete={handleDelete}
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
