"use client";

import React, { useState } from "react";
import { 
  BuildingOfficeIcon,
  UserGroupIcon,
  CogIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline";

export default function TenantManagement() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [tenants, setTenants] = useState([
    {
      id: "tenant_1",
      name: "Acme Corporation",
      domain: "acme.ai-care.com",
      tier: "enterprise",
      status: "active",
      subtenants: 3,
      agents: 25,
      calls: 1250,
      createdAt: "2024-01-01",
      settings: {
        maxAgents: 50,
        maxConcurrentCalls: 100,
        features: ["voice", "chat", "analytics", "integrations"]
      }
    },
    {
      id: "tenant_2", 
      name: "TechStart Inc",
      domain: "techstart.ai-care.com",
      tier: "professional",
      status: "active",
      subtenants: 1,
      agents: 8,
      calls: 320,
      createdAt: "2024-01-15",
      settings: {
        maxAgents: 20,
        maxConcurrentCalls: 50,
        features: ["voice", "chat", "analytics"]
      }
    },
    {
      id: "tenant_3",
      name: "Global Services",
      domain: "global.ai-care.com", 
      tier: "enterprise",
      status: "suspended",
      subtenants: 5,
      agents: 45,
      calls: 2100,
      createdAt: "2023-12-01",
      settings: {
        maxAgents: 100,
        maxConcurrentCalls: 200,
        features: ["voice", "chat", "analytics", "integrations", "custom_workflows"]
      }
    }
  ]);

  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showCreateModal, setShowCreateModal] = useState(false);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "enterprise": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "professional": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "standard": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

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
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
              <BuildingOfficeIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Tenant Management
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage organizations and their sub-organizations
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Tenant
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Tenant Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center">
              <BuildingOfficeIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Total Tenants
                </p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {tenants.length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center">
              <UserGroupIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Active Tenants
                </p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {tenants.filter(t => t.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center">
              <ShieldCheckIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                  Total Agents
                </p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {tenants.reduce((acc, t) => acc + t.agents, 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center">
              <CogIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Total Calls
                </p>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                  {tenants.reduce((acc, t) => acc + t.calls, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tenants Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Subtenants
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Agents
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Calls
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {tenant.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {tenant.domain}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTierColor(tenant.tier)}`}>
                      {tenant.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tenant.status)}`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {tenant.subtenants}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {tenant.agents}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {tenant.calls.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => setSelectedTenant(tenant.id)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tenant Details Modal */}
        {selectedTenant && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Tenant Details
                  </h3>
                  <button
                    onClick={() => setSelectedTenant(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {(() => {
                  const tenant = tenants.find(t => t.id === selectedTenant);
                  if (!tenant) return null;
                  
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Name
                          </label>
                          <p className="text-sm text-gray-900 dark:text-white">{tenant.name}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Domain
                          </label>
                          <p className="text-sm text-gray-900 dark:text-white">{tenant.domain}</p>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Features
                        </label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {tenant.settings.features.map((feature) => (
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
                          <p className="text-sm text-gray-900 dark:text-white">{tenant.settings.maxAgents}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Max Concurrent Calls
                          </label>
                          <p className="text-sm text-gray-900 dark:text-white">{tenant.settings.maxConcurrentCalls}</p>
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
