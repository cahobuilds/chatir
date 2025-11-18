"use client";

import React, { useState } from "react";
import { XMarkIcon, LinkIcon, ArrowUpTrayIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

interface AddKnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, type: "notion" | "web" | "file" | "text") => void;
}

export default function AddKnowledgeBaseModal({
  isOpen,
  onClose,
  onSave,
}: AddKnowledgeBaseModalProps) {
  const [name, setName] = useState("");
  const [showAddOptions, setShowAddOptions] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (name.trim()) {
      // Default to 'text' type for now, can be changed based on selected option
      onSave(name.trim(), "text");
      setName("");
      setShowAddOptions(false);
      onClose();
    }
  };

  const handleAddOption = (type: "notion" | "web" | "file" | "text") => {
    if (name.trim()) {
      onSave(name.trim(), type);
      setName("");
      setShowAddOptions(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Add Knowledge Base
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Knowledge Base Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Knowledge Base Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Documents Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Documents
            </label>
            <div className="relative">
              <button
                onClick={() => setShowAddOptions(!showAddOptions)}
                className="w-full px-4 py-2 text-left border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                + Add
              </button>

              {/* Dropdown Menu */}
              {showAddOptions && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
                  {/* Add Web Pages */}
                  <button
                    onClick={() => handleAddOption("web")}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 flex items-start gap-3 first:rounded-t-lg"
                  >
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <LinkIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Add Web Pages
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Crawl and sync your website
                      </p>
                    </div>
                  </button>

                  {/* Upload Files */}
                  <button
                    onClick={() => handleAddOption("file")}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 flex items-start gap-3"
                  >
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <ArrowUpTrayIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Upload Files
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        File size should be less than 100MB
                      </p>
                    </div>
                  </button>

                  {/* Add Text */}
                  <button
                    onClick={() => handleAddOption("text")}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 flex items-start gap-3 last:rounded-b-lg"
                  >
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <DocumentTextIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Add Text
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Add articles manually
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

