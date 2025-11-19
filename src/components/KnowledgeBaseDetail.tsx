"use client";

import React from "react";
import { 
  PencilIcon, 
  ArrowPathIcon, 
  TrashIcon,
  LinkIcon,
  ChevronDownIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline";
import type { KnowledgeBase } from "./KnowledgeBaseSidebar";

interface KnowledgeBaseDetailProps {
  knowledgeBase: KnowledgeBase | null;
  onEdit: () => void;
  onSync: () => void;
  onDelete: () => void;
}

export default function KnowledgeBaseDetail({
  knowledgeBase,
  onEdit,
  onSync,
  onDelete,
}: KnowledgeBaseDetailProps) {
  if (!knowledgeBase) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-800">
        <div className="text-center">
          <DocumentTextIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            Select a knowledge base to view details
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white dark:bg-gray-800 overflow-y-auto">
      {/* Header with Actions */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {knowledgeBase.name}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <PencilIcon className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={onSync}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Sync from Retell
            </button>
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>ID: {knowledgeBase.id.slice(0, 8)}...</span>
          {knowledgeBase.status === "synced" && (
            <span className="flex items-center gap-1">
              <span className="text-green-600 dark:text-green-400">✓</span>
              Uploaded by: {new Date().toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {/* Linked Sources Section */}
        {knowledgeBase.type === "notion" && (
          <div className="mb-6">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                    <LinkIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      vaulted-shoemaker-83b.notion.site
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {knowledgeBase.pageCount || 2} Pages • Last synced on {knowledgeBase.lastSynced || "11/17/2025 03:43"}
                    </p>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <ChevronDownIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Additional Content Sections */}
        <div className="space-y-6">
          {/* Documents Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Documents
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              No documents uploaded yet.
            </div>
          </div>

          {/* Web Pages Section */}
          {knowledgeBase.type === "web" && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Web Pages
              </h3>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                No web pages configured yet.
              </div>
            </div>
          )}

          {/* Settings Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Settings
            </h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center justify-between">
                <span>Auto-sync</span>
                <span className="text-gray-900 dark:text-white font-medium">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Sync Frequency</span>
                <span className="text-gray-900 dark:text-white font-medium">Daily</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

