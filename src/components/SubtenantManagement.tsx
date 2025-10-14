"use client";

import React, { useState } from "react";
import { 
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";

export default function SubtenantManagement() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [subtenants, setSubtenants] = useState([
    {
      id: "subtenant_1",
      name: "Sales Department",
      parentTenant: "Acme Corporation",
      status: "active",
      agents: 8,
      calls: 320,
      createdAt: "2024-01-01",
      settings: {
        maxAgents: 15,
        maxConcurrentCalls: 30,
        features: ["voice", "chat", "analytics"]
      }
    },
    {
      id: "subtenant_2",
      name: "Support Team",
      parentTenant: "Acme Corporation", 
      status: "active",
      agents: 12,
      calls: 580,
      createdAt: "2024-01-05",
      settings: {
        maxAgents: 20,
        maxConcurrentCalls: 50,
        features: ["voice", "chat", "analytics", "integrations"]
      }
    },
    {
      id: "subtenant_3",
      name: "Regional Office",
      parentTenant: "Acme Corporation",
      status: "pending",
      agents: 5,
      calls: 150,
      createdAt: "2024-01-10",
      settings: {
        maxAgents: 10,
        maxConcurrentCalls: 20,
        features: ["voice", "chat"]
      }
    }
  ]);

  const [selectedSubtenant, setSelectedSubtenant] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showCreateModal, setShowCreateModal] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "suspended": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserGroupIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Subtenant Management
            </h3>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Subtenant
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Subtenant Statistics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-center">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Total Subtenants
              </p>
              <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                {subtenants.length}
              </p>
            </div>
          </div>
          
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-center">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Active
              </p>
              <p className="text-xl font-bold text-green-900 dark:text-green-100">
                {subtenants.filter(s => s.status === 'active').length}
              </p>
            </div>
          </div>
          
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="text-center">
              <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                Total Agents
              </p>
              <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
                {subtenants.reduce((acc, s) => acc + s.agents, 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Subtenants List */}
        <div className="space-y-3">
          {subtenants.map((subtenant) => (
            <div
              key={subtenant.id}
              className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                    <UserGroupIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {subtenant.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {subtenant.parentTenant}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {subtenant.agents} agents
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        •
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {subtenant.calls} calls
                      </span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(subtenant.status)}`}>
                      {subtenant.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setSelectedSubtenant(subtenant.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Features */}
              <div className="mt-3 flex flex-wrap gap-1">
                {subtenant.settings.features.map((feature) => (
                  <span
                    key={feature}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Subtenant Details Modal */}
        {selectedSubtenant && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Subtenant Details
                  </h3>
                  <button
                    onClick={() => setSelectedSubtenant(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {(() => {
                  const subtenant = subtenants.find(s => s.id === selectedSubtenant);
                  if (!subtenant) return null;
                  
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Name
                          </label>
                          <p className="text-sm text-gray-900 dark:text-white">{subtenant.name}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Parent Tenant
                          </label>
                          <p className="text-sm text-gray-900 dark:text-white">{subtenant.parentTenant}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Agents
                          </label>
                          <p className="text-sm text-gray-900 dark:text-white">{subtenant.agents}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Total Calls
                          </label>
                          <p className="text-sm text-gray-900 dark:text-white">{subtenant.calls}</p>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Features
                        </label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {subtenant.settings.features.map((feature) => (
                            <span
                              key={feature}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Max Agents
                          </label>
                          <p className="text-sm text-gray-900 dark:text-white">{subtenant.settings.maxAgents}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Max Concurrent Calls
                          </label>
                          <p className="text-sm text-gray-900 dark:text-white">{subtenant.settings.maxConcurrentCalls}</p>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex space-x-3">
                          <button className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                            <PencilIcon className="w-4 h-4 mr-2" />
                            Edit Subtenant
                          </button>
                          <button className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                            <ChevronRightIcon className="w-4 h-4 mr-2" />
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
