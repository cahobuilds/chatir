"use client";

import React, { useState } from "react";
import { 
  PlayIcon,
  PlusIcon,
  TrashIcon,
  CodeBracketIcon
} from "@heroicons/react/24/outline";

export default function APIRequestBuilder() {
  const [request, setRequest] = useState({
    method: "GET",
    url: "/api/v1/calls",
    headers: [
      { key: "Content-Type", value: "application/json" },
      { key: "Authorization", value: "Bearer your-api-key" }
    ],
    body: JSON.stringify({
      example: "request body"
    }, null, 2)
  });

  const [newHeader, setNewHeader] = useState({ key: "", value: "" });

  const addHeader = () => {
    if (newHeader.key && newHeader.value) {
      setRequest({
        ...request,
        headers: [...request.headers, newHeader]
      });
      setNewHeader({ key: "", value: "" });
    }
  };

  const removeHeader = (index: number) => {
    setRequest({
      ...request,
      headers: request.headers.filter((_, i) => i !== index)
    });
  };

  const updateHeader = (index: number, field: string, value: string) => {
    const updatedHeaders = request.headers.map((header, i) => 
      i === index ? { ...header, [field]: value } : header
    );
    setRequest({ ...request, headers: updatedHeaders });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Request Builder
          </h3>
          <button className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            <PlayIcon className="w-4 h-4 mr-2" />
            Send Request
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Method and URL */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Method
            </label>
            <select
              value={request.method}
              onChange={(e) => setRequest({...request, method: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div className="col-span-10">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              URL
            </label>
            <input
              type="text"
              value={request.url}
              onChange={(e) => setRequest({...request, url: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="https://api.example.com/v1/endpoint"
            />
          </div>
        </div>

        {/* Headers */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Headers
            </h4>
            <button
              onClick={addHeader}
              className="inline-flex items-center px-3 py-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Add Header
            </button>
          </div>

          <div className="space-y-3">
            {request.headers.map((header, index) => (
              <div key={index} className="grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  <input
                    type="text"
                    value={header.key}
                    onChange={(e) => updateHeader(index, "key", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                    placeholder="Header name"
                  />
                </div>
                <div className="col-span-6">
                  <input
                    type="text"
                    value={header.value}
                    onChange={(e) => updateHeader(index, "value", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                    placeholder="Header value"
                  />
                </div>
                <div className="col-span-1">
                  <button
                    onClick={() => removeHeader(index)}
                    className="w-full h-10 flex items-center justify-center text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Request Body */}
        {(request.method === "POST" || request.method === "PUT" || request.method === "PATCH") && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
              Request Body
            </h4>
            <div className="relative">
              <textarea
                value={request.body}
                onChange={(e) => setRequest({...request, body: e.target.value})}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                placeholder="Enter JSON request body..."
              />
              <div className="absolute top-2 right-2">
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded dark:bg-gray-700 dark:text-gray-300">
                  <CodeBracketIcon className="w-3 h-3 mr-1" />
                  JSON
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-3">
            <button className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
              Save Request
            </button>
            <button className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
              Load Example
            </button>
            <button className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
              Clear All
            </button>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Ready to send
          </div>
        </div>
      </div>
    </div>
  );
}
