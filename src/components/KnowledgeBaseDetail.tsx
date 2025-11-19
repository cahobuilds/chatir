"use client";

import React, { useState, useEffect } from "react";
import { 
  PencilIcon, 
  ArrowPathIcon, 
  TrashIcon,
  LinkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  PlusIcon,
  XMarkIcon,
  ArrowUpTrayIcon
} from "@heroicons/react/24/outline";
import type { KnowledgeBase } from "./KnowledgeBaseSidebar";

interface Source {
  id: string;
  source_type: 'notion' | 'web' | 'file' | 'text';
  source_url: string | null;
  source_data: any;
  status: string;
  created_at: string;
}

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
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [showAddSource, setShowAddSource] = useState(false);
  const [addSourceType, setAddSourceType] = useState<'url' | 'file' | 'text'>('url');
  const [urls, setUrls] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (knowledgeBase?.id) {
      fetchSources();
    }
  }, [knowledgeBase?.id]);

  const fetchSources = async () => {
    if (!knowledgeBase?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/knowledge-bases/${knowledgeBase.id}/sources`);
      if (response.ok) {
        const data = await response.json();
        setSources(data.sources || []);
      }
    } catch (error) {
      console.error('Error fetching sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSource = (sourceId: string) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(sourceId)) {
      newExpanded.delete(sourceId);
    } else {
      newExpanded.add(sourceId);
    }
    setExpandedSources(newExpanded);
  };

  const handleAddSources = async () => {
    if (!knowledgeBase?.id) return;

    setAdding(true);
    try {
      const formData = new FormData();
      
      if (addSourceType === 'url' && urls.trim()) {
        formData.append('urls', urls);
      } else if (addSourceType === 'text' && textContent.trim()) {
        formData.append('text_title', textTitle || 'Untitled');
        formData.append('text_content', textContent);
      } else if (addSourceType === 'file' && selectedFiles.length > 0) {
        selectedFiles.forEach(file => {
          formData.append('files', file);
        });
      } else {
        alert('Please provide content to add');
        setAdding(false);
        return;
      }

      const response = await fetch(`/api/knowledge-bases/${knowledgeBase.id}/sources`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add sources');
      }

      // Reset form
      setUrls('');
      setTextTitle('');
      setTextContent('');
      setSelectedFiles([]);
      setShowAddSource(false);
      
      // Refresh sources
      await fetchSources();
      
      // Refresh knowledge base list (call parent refresh)
      if (onSync) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to add sources');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!knowledgeBase?.id) return;
    if (!confirm('Are you sure you want to delete this source?')) return;

    try {
      const response = await fetch(`/api/knowledge-bases/${knowledgeBase.id}/sources/${sourceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete source');
      }

      // Refresh sources
      await fetchSources();
      
      // Refresh knowledge base list
      if (onSync) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to delete source');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'web':
      case 'url':
        return <LinkIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />;
      case 'file':
      case 'document':
        return <DocumentTextIcon className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'text':
        return <DocumentTextIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      default:
        return <DocumentTextIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getSourceDisplayName = (source: Source) => {
    if (source.source_type === 'web' && source.source_url) {
      try {
        const url = new URL(source.source_url);
        return url.hostname;
      } catch {
        return source.source_url;
      }
    }
    if (source.source_type === 'file' && source.source_data?.filename) {
      return source.source_data.filename;
    }
    if (source.source_type === 'text' && source.source_data?.title) {
      return source.source_data.title;
    }
    return source.source_url || 'Untitled';
  };

  const getSourcePageCount = (source: Source) => {
    if (source.source_data?.page_count) {
      return source.source_data.page_count;
    }
    return 1;
  };

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

  const urlSources = sources.filter(s => s.source_type === 'web');
  const fileSources = sources.filter(s => s.source_type === 'file');
  const textSources = sources.filter(s => s.source_type === 'text');

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
              {knowledgeBase.lastSynced && `Last synced: ${knowledgeBase.lastSynced}`}
            </span>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {/* Add Source Button */}
        <div className="mb-6">
          {!showAddSource ? (
            <button
              onClick={() => setShowAddSource(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Sources
            </button>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Add Sources</h3>
                <button
                  onClick={() => {
                    setShowAddSource(false);
                    setUrls('');
                    setTextTitle('');
                    setTextContent('');
                    setSelectedFiles([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Source Type Selector */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setAddSourceType('url')}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    addSourceType === 'url'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  URLs
                </button>
                <button
                  onClick={() => setAddSourceType('file')}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    addSourceType === 'file'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  Files
                </button>
                <button
                  onClick={() => setAddSourceType('text')}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    addSourceType === 'text'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  Text
                </button>
              </div>

              {/* URL Input */}
              {addSourceType === 'url' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    URLs (one per line)
                  </label>
                  <textarea
                    value={urls}
                    onChange={(e) => setUrls(e.target.value)}
                    placeholder="https://example.com&#10;https://example.com/page"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              )}

              {/* File Input */}
              {addSourceType === 'file' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Files (PDF, DOCX, TXT, MD, HTML, JSON, CSV - Max 50MB each)
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {selectedFiles.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {selectedFiles.length} file(s) selected
                    </div>
                  )}
                </div>
              )}

              {/* Text Input */}
              {addSourceType === 'text' && (
                <div className="mb-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={textTitle}
                      onChange={(e) => setTextTitle(e.target.value)}
                      placeholder="Enter title"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Content
                    </label>
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Enter text content"
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleAddSources}
                  disabled={adding}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {adding ? 'Adding...' : 'Add Sources'}
                </button>
                <button
                  onClick={() => {
                    setShowAddSource(false);
                    setUrls('');
                    setTextTitle('');
                    setTextContent('');
                    setSelectedFiles([]);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Loading sources...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Web Pages Section */}
            {urlSources.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Web Pages ({urlSources.length})
                </h3>
                <div className="space-y-2">
                  {urlSources.map((source) => {
                    const isExpanded = expandedSources.has(source.id);
                    return (
                      <div
                        key={source.id}
                        className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex-shrink-0">
                              {getSourceIcon(source.source_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {getSourceDisplayName(source)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {getSourcePageCount(source)} {getSourcePageCount(source) === 1 ? 'Page' : 'Pages'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleSource(source.id)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              {isExpanded ? (
                                <ChevronUpIcon className="w-5 h-5" />
                              ) : (
                                <ChevronDownIcon className="w-5 h-5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteSource(source.id)}
                              className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {isExpanded && source.source_url && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <p className="text-xs text-gray-500 dark:text-gray-400 break-all">
                              {source.source_url}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Documents Section */}
            {fileSources.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Documents ({fileSources.length})
                </h3>
                <div className="space-y-2">
                  {fileSources.map((source) => (
                    <div
                      key={source.id}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg flex-shrink-0">
                          {getSourceIcon(source.source_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {getSourceDisplayName(source)}
                          </p>
                          {source.source_data?.file_size && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {(source.source_data.file_size / 1024).toFixed(2)} KB
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSource(source.id)}
                        className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Text Sources Section */}
            {textSources.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Text Articles ({textSources.length})
                </h3>
                <div className="space-y-2">
                  {textSources.map((source) => {
                    const isExpanded = expandedSources.has(source.id);
                    return (
                      <div
                        key={source.id}
                        className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex-shrink-0">
                              {getSourceIcon(source.source_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {getSourceDisplayName(source)}
                              </p>
                              {source.source_data?.text && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {source.source_data.text.length} characters
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleSource(source.id)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              {isExpanded ? (
                                <ChevronUpIcon className="w-5 h-5" />
                              ) : (
                                <ChevronDownIcon className="w-5 h-5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteSource(source.id)}
                              className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {isExpanded && source.source_data?.text && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                              {source.source_data.text.substring(0, 500)}
                              {source.source_data.text.length > 500 ? '...' : ''}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {sources.length === 0 && (
              <div className="text-center py-12">
                <DocumentTextIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No sources added yet. Click "Add Sources" to get started.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
