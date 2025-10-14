"use client";

import React, { useState } from "react";
import { 
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentIcon
} from "@heroicons/react/24/outline";

interface ResponseTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  variables: string[];
  usage: number;
  lastUsed: string;
}

const mockTemplates: ResponseTemplate[] = [
  {
    id: "1",
    name: "Welcome Message",
    category: "Greeting",
    content: "Hello {{customer_name}}! Welcome to our support. How can I help you today?",
    variables: ["customer_name"],
    usage: 1247,
    lastUsed: "2 minutes ago"
  },
  {
    id: "2",
    name: "Issue Acknowledgment",
    category: "Support",
    content: "I understand you're experiencing {{issue_type}}. Let me help you resolve this issue.",
    variables: ["issue_type"],
    usage: 892,
    lastUsed: "5 minutes ago"
  },
  {
    id: "3",
    name: "Escalation Notice",
    category: "Escalation",
    content: "I'm transferring you to a human agent who can better assist with your {{issue_type}} inquiry.",
    variables: ["issue_type"],
    usage: 156,
    lastUsed: "1 hour ago"
  },
  {
    id: "4",
    name: "Closing Message",
    category: "Closing",
    content: "Thank you for contacting us, {{customer_name}}. Is there anything else I can help you with?",
    variables: ["customer_name"],
    usage: 234,
    lastUsed: "2 hours ago"
  }
];

export default function ResponseTemplates() {
  const [templates, setTemplates] = useState<ResponseTemplate[]>(mockTemplates);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showNewTemplate, setShowNewTemplate] = useState(false);

  const categories = ["all", "Greeting", "Support", "Escalation", "Closing", "FAQ"];

  const filteredTemplates = selectedCategory === "all" 
    ? templates 
    : templates.filter(template => template.category === selectedCategory);

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    // You could add a toast notification here
  };

  const deleteTemplate = (id: string) => {
    setTemplates(templates.filter(template => template.id !== id));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DocumentTextIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Response Templates
            </h3>
          </div>
          <button 
            onClick={() => setShowNewTemplate(true)}
            className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            New
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Category Filter */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  selectedCategory === category
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {category === "all" ? "All" : category}
              </button>
            ))}
          </div>
        </div>

        {/* Templates List */}
        <div className="space-y-3">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {template.name}
                    </h4>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                      {template.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {template.content}
                  </p>
                  {template.variables.length > 0 && (
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Variables:</span>
                      {template.variables.map((variable, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                        >
                          {variable}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Used {template.usage} times</span>
                    <span>Last used: {template.lastUsed}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1 ml-4">
                  <button
                    onClick={() => copyToClipboard(template.content)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Copy to clipboard"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    title="Edit template"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    title="Delete template"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-8">
            <DocumentTextIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No templates found for the selected category.
            </p>
          </div>
        )}

        {/* New Template Form */}
        {showNewTemplate && (
          <div className="mt-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
              Create New Template
            </h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    placeholder="Template name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white">
                    <option value="Greeting">Greeting</option>
                    <option value="Support">Support</option>
                    <option value="Escalation">Escalation</option>
                    <option value="Closing">Closing</option>
                    <option value="FAQ">FAQ</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Content
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter template content. Use {{variable_name}} for dynamic variables."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                  Create Template
                </button>
                <button 
                  onClick={() => setShowNewTemplate(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
