"use client";

import React, { useState, useEffect } from "react";
import KnowledgeBaseSidebar, { type KnowledgeBase } from "@/components/KnowledgeBaseSidebar";
import KnowledgeBaseDetail from "@/components/KnowledgeBaseDetail";
import AddKnowledgeBaseModal from "@/components/AddKnowledgeBaseModal";

// Mock data - replace with actual API call
const mockKnowledgeBases: KnowledgeBase[] = [
  {
    id: "kb-1",
    name: "PetStore Notion",
    type: "notion",
    pageCount: 2,
    lastSynced: "11/17/2025 03:43",
    status: "synced",
  },
  {
    id: "kb-2",
    name: "New Notion Test",
    type: "notion",
    pageCount: 1,
    lastSynced: "11/16/2025 14:20",
    status: "synced",
  },
  {
    id: "kb-3",
    name: "For DEMO Only",
    type: "web",
    pageCount: 5,
    lastSynced: "11/17/2025 10:15",
    status: "syncing",
  },
  {
    id: "kb-4",
    name: "PSD-1-200",
    type: "file",
    pageCount: 0,
    lastSynced: "11/15/2025 09:30",
    status: "synced",
  },
  {
    id: "kb-5",
    name: "CSS Website",
    type: "web",
    pageCount: 12,
    lastSynced: "11/17/2025 08:00",
    status: "synced",
  },
  {
    id: "kb-6",
    name: "Website",
    type: "web",
    pageCount: 8,
    lastSynced: "11/16/2025 16:45",
    status: "error",
  },
];

export default function KnowledgeBasePage() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>(mockKnowledgeBases);
  const [selectedKb, setSelectedKb] = useState<KnowledgeBase | null>(
    mockKnowledgeBases.length > 0 ? mockKnowledgeBases[0] : null
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Set page title
  useEffect(() => {
    document.title = "Knowledge Base Management | AI Customer Care - TinAdmin";
  }, []);

  const handleSelect = (kb: KnowledgeBase) => {
    setSelectedKb(kb);
  };

  const handleAddNew = () => {
    setIsAddModalOpen(true);
  };

  const handleSaveNew = (name: string, type: "notion" | "web" | "file" | "text") => {
    const newKb: KnowledgeBase = {
      id: `kb-${Date.now()}`,
      name,
      type,
      pageCount: 0,
      status: "synced",
    };
    setKnowledgeBases([...knowledgeBases, newKb]);
    setSelectedKb(newKb);
    setIsAddModalOpen(false);
  };

  const handleEdit = () => {
    // TODO: Open edit modal
    console.log("Edit knowledge base:", selectedKb?.id);
  };

  const handleSync = () => {
    // TODO: Trigger sync
    console.log("Sync knowledge base:", selectedKb?.id);
  };

  const handleDelete = () => {
    if (!selectedKb) return;
    if (confirm(`Are you sure you want to delete "${selectedKb.name}"?`)) {
      setKnowledgeBases(knowledgeBases.filter((kb) => kb.id !== selectedKb.id));
      const newSelected = knowledgeBases.find((kb) => kb.id !== selectedKb.id) || null;
      setSelectedKb(newSelected);
    }
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] -mx-4 md:-mx-6 overflow-hidden">
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
