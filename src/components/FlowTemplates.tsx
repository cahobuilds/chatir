"use client";

import React, { useState } from "react";
import { 
  DocumentTextIcon,
  PlusIcon,
  PlayIcon,
  DocumentDuplicateIcon,
  StarIcon
} from "@heroicons/react/24/outline";

interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  complexity: "simple" | "medium" | "complex";
  nodes: number;
  connections: number;
  isFavorite: boolean;
  lastUsed: string;
  usage: number;
}

const mockTemplates: FlowTemplate[] = [
  {
    id: "1",
    name: "Basic Customer Service",
    description: "Simple greeting, menu, and routing flow",
    category: "Customer Service",
    complexity: "simple",
    nodes: 5,
    connections: 4,
    isFavorite: true,
    lastUsed: "2 hours ago",
    usage: 1247
  },
  {
    id: "2",
    name: "Billing Support Flow",
    description: "Comprehensive billing inquiry and payment processing",
    category: "Billing",
    complexity: "medium",
    nodes: 12,
    connections: 15,
    isFavorite: false,
    lastUsed: "1 day ago",
    usage: 892
  },
  {
    id: "3",
    name: "Technical Support",
    description: "Multi-level technical support with escalation",
    category: "Support",
    complexity: "complex",
    nodes: 18,
    connections: 22,
    isFavorite: true,
    lastUsed: "3 days ago",
    usage: 156
  },
  {
    id: "4",
    name: "Sales Qualification",
    description: "Lead qualification and appointment booking",
    category: "Sales",
    complexity: "medium",
    nodes: 10,
    connections: 12,
    isFavorite: false,
    lastUsed: "1 week ago",
    usage: 234
  },
  {
    id: "5",
    name: "Emergency Hotline",
    description: "Priority routing for urgent calls",
    category: "Emergency",
    complexity: "simple",
    nodes: 6,
    connections: 5,
    isFavorite: false,
    lastUsed: "2 weeks ago",
    usage: 45
  },
  {
    id: "6",
    name: "Multi-language Support",
    description: "Language detection and routing",
    category: "International",
    complexity: "complex",
    nodes: 15,
    connections: 18,
    isFavorite: true,
    lastUsed: "1 month ago",
    usage: 78
  }
];

export default function FlowTemplates() {
  const [templates, setTemplates] = useState<FlowTemplate[]>(mockTemplates);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = ["all", "Customer Service", "Billing", "Support", "Sales", "Emergency", "International"];

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case "simple":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "complex":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const toggleFavorite = (templateId: string) => {
    setTemplates(templates.map(template => 
      template.id === templateId 
        ? { ...template, isFavorite: !template.isFavorite }
        : template
    ));
  };

  const handleUseTemplate = (templateId: string) => {
    console.log(`Using template: ${templateId}`);
    // Here you would implement the logic to load the template into the flow builder
  };

  const duplicateTemplate = (templateId: string) => {
    console.log(`Duplicating template: ${templateId}`);
    // Here you would implement the logic to duplicate the template
  };

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DocumentTextIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Flow Templates
            </h3>
          </div>
          <button className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            <PlusIcon className="w-4 h-4 mr-1" />
            New
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

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
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getComplexityColor(template.complexity)}`}>
                      {template.complexity}
                    </span>
                    {template.isFavorite && (
                      <StarIcon className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {template.description}
                  </p>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Category: {template.category}</span>
                    <span>Nodes: {template.nodes}</span>
                    <span>Connections: {template.connections}</span>
                    <span>Used {template.usage} times</span>
                  </div>
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Last used: {template.lastUsed}
                  </p>
                </div>

                <div className="flex flex-col space-y-1 ml-4">
                  <button
                    onClick={() => handleUseTemplate(template.id)}
                    className="p-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                    title="Use template"
                  >
                    <PlayIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => duplicateTemplate(template.id)}
                    className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    title="Duplicate template"
                  >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleFavorite(template.id)}
                    className={`p-1.5 rounded transition-colors ${
                      template.isFavorite
                        ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                        : "bg-gray-50 dark:bg-gray-700 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                    }`}
                    title={template.isFavorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    <StarIcon className="w-4 h-4" />
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
              No templates found matching your criteria.
            </p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {templates.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {templates.filter(t => t.isFavorite).length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Favorites</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {templates.filter(t => t.complexity === "simple").length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Simple</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
