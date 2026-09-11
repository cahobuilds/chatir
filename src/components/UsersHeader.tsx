"use client";

import React, { useState, useEffect } from "react";
import { 
  UsersIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  CogIcon
} from "@heroicons/react/24/outline";

interface UsersHeaderProps {
  onAddUser?: () => void;
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  pendingInvites: number;
  totalRoles: number;
}

export default function UsersHeader({ onAddUser }: UsersHeaderProps) {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    pendingInvites: 0,
    totalRoles: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch users and roles in parallel
      const [usersResponse, rolesResponse] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/roles'),
      ]);

      if (usersResponse.ok && rolesResponse.ok) {
        const usersData = await usersResponse.json();
        const rolesData = await rolesResponse.json();

        const users = usersData.users || [];
        const roles = rolesData.roles || [];

        // Calculate statistics
        const activeUsers = users.filter((u: any) => 
          u.tenants?.some((t: any) => t.status === 'active')
        ).length;

        const pendingInvites = users.filter((u: any) => 
          !u.email_confirmed || u.tenants?.some((t: any) => t.status === 'pending')
        ).length;

        setStats({
          totalUsers: users.length,
          activeUsers,
          pendingInvites,
          totalRoles: roles.length,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

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
              Manage users, roles, and permissions for the platform
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Add User button clicked in UsersHeader', { onAddUser: !!onAddUser });
              if (onAddUser) {
                onAddUser();
              } else {
                console.warn('onAddUser callback is not provided');
              }
            }}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer"
          >
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
                {loading ? '...' : stats.totalUsers}
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
                {loading ? '...' : stats.activeUsers}
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
                {loading ? '...' : stats.pendingInvites}
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
                {loading ? '...' : stats.totalRoles}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
