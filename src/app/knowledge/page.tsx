import type { Metadata } from "next";
import React from "react";
import KnowledgeBaseHeader from "@/components/KnowledgeBaseHeader";
import KnowledgeBaseStats from "@/components/KnowledgeBaseStats";
import KnowledgeBaseContent from "@/components/KnowledgeBaseContent";
import KnowledgeBaseUpload from "@/components/KnowledgeBaseUpload";

export const metadata: Metadata = {
  title:
    "Knowledge Base Management | AI Customer Care - TinAdmin",
  description: "Centralized content repository for AI agent training and customer support knowledge management",
};

export default function KnowledgeBasePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <KnowledgeBaseHeader />

      {/* Stats Overview */}
      <KnowledgeBaseStats />

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <KnowledgeBaseContent />
        </div>
        <div>
          <KnowledgeBaseUpload />
        </div>
      </div>
    </div>
  );
}
