"use client";

import React from "react";
import { 
  UsersIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  CogIcon
} from "@heroicons/react/24/outline";

export default function UsersHeader() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
            <UsersIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              User & Role Management
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage users, roles, and permissions for AI customer care operations
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            <CogIcon className="w-4 h-4 mr-2" />
            Settings
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            <UserPlusIcon className="w-4 h-4 mr-2" />
            Add User
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center">
            <UsersIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Total Users
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                24
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center">
            <ShieldCheckIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Active Users
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                18
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center">
            <UserPlusIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Pending Invites
              </p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                3
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center">
            <CogIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                Roles
              </p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                5
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
