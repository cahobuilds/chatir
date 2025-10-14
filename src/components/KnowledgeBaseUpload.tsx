"use client";

import React, { useState } from "react";

export default function KnowledgeBaseUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleFiles = (_files: FileList) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const supportedFormats = ["PDF", "DOCX", "TXT", "MD", "HTML", "JSON", "CSV"];

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Upload Content
        </h3>
        
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
              : "border-gray-300 dark:border-gray-600"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="text-4xl mb-4">📤</div>
          <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Drop files here or click to upload
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Supported formats: {supportedFormats.join(", ")}
          </p>
          
          {isUploading ? (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Uploading... {uploadProgress}%
              </p>
            </div>
          ) : (
            <button className="rounded-lg bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700">
              Choose Files
            </button>
          )}
        </div>
      </div>

      {/* Quick Add Options */}
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Add
        </h3>
        
        <div className="space-y-3">
          <button className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-left hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🌐</span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Add URL Source
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sync content from web pages
                </p>
              </div>
            </div>
          </button>

          <button className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-left hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🔗</span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Connect API
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sync from external APIs
                </p>
              </div>
            </div>
          </button>

          <button className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-left hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">✏️</span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Create Manual Entry
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Add custom knowledge items
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Sync Sources */}
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Sync Sources
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <span className="text-xl">🌐</span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Company Wiki
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Last synced: 2 hours ago
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <button className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                Sync Now
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <span className="text-xl">📊</span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Product API
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Last synced: 1 hour ago
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <button className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                Sync Now
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <span className="text-xl">📚</span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Help Center
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Last synced: 3 hours ago
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
              <button className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                Sync Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
