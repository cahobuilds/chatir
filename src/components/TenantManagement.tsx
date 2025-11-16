"use client";

import React, { useState, useEffect } from "react";
import ComponentCard from "./common/ComponentCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "./ui/table";
import Badge from "./ui/badge/Badge";
import Button from "./ui/button/Button";
import { Modal } from "./ui/modal";
import { getRoleDisplayName } from "@/lib/roles-client";

interface Tenant {
  id: string;
  name: string;
  subdomain: string | null;
  domain: string | null;
  tier: 'standard' | 'premium' | 'enterprise';
  billing_plan: string;
  created_at: string;
  tenant_id?: string; // From user_tenants join
  role?: string; // User's role in this tenant
}

interface TenantUser {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  last_login: string | null;
  created_at: string;
}

interface TenantWithUsers extends Tenant {
  users: TenantUser[];
  agentCount?: number;
  interactionCount?: number;
}

export default function TenantManagement() {
  const [tenants, setTenants] = useState<TenantWithUsers[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<TenantWithUsers | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/tenants");
      
      if (!response.ok) {
        console.error("Failed to fetch tenants");
        return;
      }

      const data = await response.json();
      const tenantList = data.tenants || [];

      // Extract tenant objects from nested structure
      const extractedTenants: Tenant[] = tenantList.map((item: any) => {
        if (item.tenants) {
          return {
            ...item.tenants,
            tenant_id: item.tenant_id,
            role: item.role,
          };
        }
        return {
          id: item.id || item.tenant_id,
          name: item.name,
          subdomain: item.subdomain,
          domain: item.domain,
          tier: item.tier || 'standard',
          billing_plan: item.billing_plan || 'pay_as_you_go',
          created_at: item.created_at,
          tenant_id: item.tenant_id,
          role: item.role,
        };
      });

      // Fetch users and stats for each tenant
      const tenantsWithUsers = await Promise.all(
        extractedTenants.map(async (tenant) => {
          try {
            // Fetch users for this tenant
            const usersResponse = await fetch(`/api/tenants/${tenant.id}/users`);
            const usersData = usersResponse.ok 
              ? await usersResponse.json() 
              : { users: [] };

            // Fetch agent count
            const agentsResponse = await fetch("/api/agents");
            const agentsData = agentsResponse.ok 
              ? await agentsResponse.json() 
              : { agents: [] };
            const agentCount = (agentsData.agents || []).filter(
              (a: any) => a.tenant_id === tenant.id
            ).length;

            return {
              ...tenant,
              users: usersData.users || [],
              agentCount,
            };
          } catch (error) {
            console.error(`Failed to fetch data for tenant ${tenant.id}:`, error);
            return {
              ...tenant,
              users: [],
              agentCount: 0,
            };
          }
        })
      );

      setTenants(tenantsWithUsers);
    } catch (error) {
      console.error("Failed to fetch tenants:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string): "primary" | "success" | "info" | "warning" | "error" | "light" | "dark" => {
    switch (tier) {
      case "enterprise": return "error";
      case "premium": return "info";
      case "standard": return "success";
      default: return "light";
    }
  };

  const getRoleBadgeColor = (role: string): "primary" | "success" | "info" | "warning" | "error" | "light" | "dark" => {
    switch (role) {
      case "system_admin":
      case "super_admin":
        return "error";
      case "organization_admin":
      case "tenant_admin":
        return "primary";
      case "manager":
      case "call_manager":
        return "info";
      case "agent":
        return "success";
      case "analyst":
        return "warning";
      case "viewer":
      case "user":
        return "light";
      default:
        return "light";
    }
  };

  const handleViewTenant = (tenant: TenantWithUsers) => {
    setSelectedTenant(tenant);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <ComponentCard title="Organization Management" desc="Manage organizations and their users">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </ComponentCard>
    );
  }

  const activeTenants = tenants.filter(t => true); // All tenants are active in our system
  const totalAgents = tenants.reduce((acc, t) => acc + (t.agentCount || 0), 0);

  return (
    <>
      <ComponentCard title="Organization Management" desc="Manage organizations and their users">
        <div className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Total Organizations
                  </p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {tenants.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Total Users
                  </p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {tenants.reduce((acc, t) => acc + t.users.length, 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                    Total Agents
                  </p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {totalAgents}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Organizations Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Organization
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Tier
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Users
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Agents
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Your Role
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Created
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {tenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                      No organizations found. Create your first organization to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="px-5 py-4 text-start">
                        <div>
                          <div className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {tenant.name}
                          </div>
                          {tenant.subdomain && (
                            <div className="text-gray-500 text-theme-xs dark:text-gray-400">
                              {tenant.subdomain}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <Badge
                          size="sm"
                          color={getTierColor(tenant.tier)}
                          variant="light"
                        >
                          {tenant.tier}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <span className="text-theme-sm font-medium">{tenant.users.length}</span>
                          {tenant.users.length > 0 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ({tenant.users.map(u => getRoleDisplayName(u.role)).join(', ')})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-gray-600 dark:text-gray-400">
                        {tenant.agentCount || 0}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        {tenant.role && (
                          <Badge
                            size="sm"
                            color={getRoleBadgeColor(tenant.role)}
                            variant="light"
                          >
                            {getRoleDisplayName(tenant.role)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-gray-500 text-theme-sm dark:text-gray-400">
                        {new Date(tenant.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewTenant(tenant)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </ComponentCard>

      {/* Organization Details Modal */}
      {selectedTenant && isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTenant(null);
          }}
          title={`Organization: ${selectedTenant.name}`}
        >
          <div className="space-y-6">
            {/* Organization Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <p className="text-sm text-gray-900 dark:text-white">{selectedTenant.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tier
                </label>
                <Badge
                  size="sm"
                  color={getTierColor(selectedTenant.tier)}
                  variant="light"
                >
                  {selectedTenant.tier}
                </Badge>
              </div>
              {selectedTenant.subdomain && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subdomain
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedTenant.subdomain}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Billing Plan
                </label>
                <p className="text-sm text-gray-900 dark:text-white">{selectedTenant.billing_plan}</p>
              </div>
            </div>

            {/* Users Section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Users with Access ({selectedTenant.users.length})
              </h4>
              {selectedTenant.users.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No users found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                      <TableRow>
                        <TableCell isHeader className="px-4 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                          User
                        </TableCell>
                        <TableCell isHeader className="px-4 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                          Role
                        </TableCell>
                        <TableCell isHeader className="px-4 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                          Status
                        </TableCell>
                        <TableCell isHeader className="px-4 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                          Last Login
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                      {selectedTenant.users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="px-4 py-3 text-start">
                            <div>
                              <div className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                                {user.name}
                              </div>
                              <div className="text-gray-500 text-theme-xs dark:text-gray-400">
                                {user.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-start">
                            <Badge
                              size="sm"
                              color={getRoleBadgeColor(user.role)}
                              variant="light"
                            >
                              {getRoleDisplayName(user.role)}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-start">
                            <Badge
                              size="sm"
                              color={user.status === 'active' ? 'success' : 'error'}
                              variant="light"
                            >
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-start text-gray-500 text-theme-sm dark:text-gray-400">
                            {user.last_login 
                              ? new Date(user.last_login).toLocaleDateString()
                              : 'Never'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
