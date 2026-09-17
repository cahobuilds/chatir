"use client";

import React, { useState } from "react";
import { 
  DocumentTextIcon, 
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";

export interface KnowledgeBase {
  id: string;
  name: string;
  type?: "notion" | "web" | "file" | "text";
  pageCount?: number;
  lastSynced?: string;
  status?: "synced" | "syncing" | "error";
}

interface KnowledgeBaseSidebarProps {
  knowledgeBases: KnowledgeBase[];
  selectedId?: string | null;
  onSelect: (kb: KnowledgeBase) => void;
  onAddNew: () => void;
  onSync?: () => void;
  syncing?: boolean;
}

export default function KnowledgeBaseSidebar({
  knowledgeBases,
  selectedId,
  onSelect,
  onAddNew,
  onSync,
  syncing = false,
}: KnowledgeBaseSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBases = knowledgeBases.filter((kb) =>
    kb.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIndicator = (status?: string) => {
    switch (status) {
      case "synced":
        return <div className="h-2 w-2 rounded-full bg-green-500"></div>;
      case "syncing":
        return <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></div>;
      case "error":
        return <div className="h-2 w-2 rounded-full bg-red-500"></div>;
      default:
        return <div className="h-2 w-2 rounded-full bg-gray-400"></div>;
    }
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Knowledge Base
          </h2>
          <div className="flex items-center gap-2">
            {onSync && (
              <button
                onClick={onSync}
                disabled={syncing}
                className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Database Sync"
              >
                <ArrowPathIcon className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={onAddNew}
              className="p-1.5 rounded-lg bg-gray-900 dark:bg-gray-700 text-white hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
              title="Add Knowledge Base"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Knowledge Base List */}
      <div className="flex-1 overflow-y-auto">
        {filteredBases.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchQuery ? "No knowledge bases found" : "No knowledge bases yet"}
            </p>
            {!searchQuery && (
              <button
                onClick={onAddNew}
                className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
              >
                Create your first one
              </button>
            )}
          </div>
        ) : (
          <div className="p-2">
            {filteredBases.map((kb) => {
              const isSelected = selectedId === kb.id;
              return (
                <button
                  key={kb.id}
                  onClick={() => onSelect(kb)}
                  className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
                    isSelected
                      ? "bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <DocumentTextIcon className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {kb.name}
                        </p>
                        {kb.status && getStatusIndicator(kb.status)}
                      </div>
                      {typeof kb.pageCount === "number" && kb.pageCount > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {kb.pageCount} {kb.pageCount === 1 ? "Page" : "Pages"}
                        </p>
                      )}
                      {kb.lastSynced && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Last synced: {kb.lastSynced}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

