"use client";

import React, { useState } from "react";
import { 
  ShieldCheckIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
  KeyIcon
} from "@heroicons/react/24/outline";

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  isDefault: boolean;
  createdAt: string;
}

const mockRoles: Role[] = [
  {
    id: "1",
    name: "Admin",
    description: "Full system access and management capabilities",
    permissions: ["all"],
    userCount: 2,
    isDefault: false,
    createdAt: "2024-01-15"
  },
  {
    id: "2",
    name: "Manager",
    description: "Team management and operational oversight",
    permissions: ["view", "edit", "manage_agents", "view_analytics", "manage_users"],
    userCount: 5,
    isDefault: false,
    createdAt: "2024-01-15"
  },
  {
    id: "3",
    name: "Agent",
    description: "Customer service and call intervention",
    permissions: ["view", "intervene", "view_calls"],
    userCount: 12,
    isDefault: true,
    createdAt: "2024-01-15"
  },
  {
    id: "4",
    name: "Analyst",
    description: "Data analysis and reporting access",
    permissions: ["view", "analytics", "reports"],
    userCount: 3,
    isDefault: false,
    createdAt: "2024-01-20"
  },
  {
    id: "5",
    name: "Viewer",
    description: "Read-only access to system data",
    permissions: ["view"],
    userCount: 8,
    isDefault: false,
    createdAt: "2024-02-01"
  }
];

const availablePermissions = [
  "all",
  "view",
  "edit",
  "create",
  "delete",
  "manage_agents",
  "manage_users",
  "manage_roles",
  "view_analytics",
  "view_calls",
  "intervene",
  "manage_integrations",
  "manage_webhooks",
  "manage_phone_numbers",
  "manage_knowledge_base",
  "manage_flows",
  "reports",
  "system_settings"
];

export default function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>(mockRoles);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showNewRole, setShowNewRole] = useState(false);

  const getRoleColor = (name: string) => {
    switch (name) {
      case "Admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "Manager":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "Agent":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "Analyst":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "Viewer":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const deleteRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role?.isDefault) {
      alert("Cannot delete default roles");
      return;
    }
    setRoles(roles.filter(role => role.id !== roleId));
  };

  const duplicateRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role) {
      const newRole: Role = {
        ...role,
        id: Date.now().toString(),
        name: `${role.name} Copy`,
        userCount: 0,
        isDefault: false,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setRoles([...roles, newRole]);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheckIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Role Management
            </h3>
          </div>
          <button 
            onClick={() => setShowNewRole(true)}
            className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            New Role
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {roles.map((role) => (
            <div
              key={role.id}
              className={`p-4 border rounded-lg transition-all duration-200 ${
                selectedRole === role.id
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {role.name}
                    </h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(role.name)}`}>
                      {role.name}
                    </span>
                    {role.isDefault && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                        Default
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {role.description}
                  </p>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <UsersIcon className="w-3 h-3" />
                      <span>{role.userCount} users</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <KeyIcon className="w-3 h-3" />
                      <span>{role.permissions.length} permissions</span>
                    </div>
                    <span>Created: {role.createdAt}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1 ml-4">
                  <button
                    onClick={() => setSelectedRole(selectedRole === role.id ? null : role.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="View details"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => duplicateRole(role.id)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    title="Duplicate role"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteRole(role.id)}
                    disabled={role.isDefault}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={role.isDefault ? "Cannot delete default role" : "Delete role"}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {selectedRole === role.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Permissions
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.map((permission, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                      >
                        {permission}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* New Role Form */}
        {showNewRole && (
          <div className="mt-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
              Create New Role
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role Name
                </label>
                <input
                  type="text"
                  placeholder="Enter role name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter role description"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Permissions
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {availablePermissions.map((permission) => (
                    <label key={permission} className="flex items-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        {permission}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                  Create Role
                </button>
                <button 
                  onClick={() => setShowNewRole(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {roles.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Roles</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {roles.filter(r => !r.isDefault).length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Custom Roles</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
