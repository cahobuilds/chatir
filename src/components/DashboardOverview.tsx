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
import Link from "next/link";

interface Tenant {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

interface Agent {
  id: string;
  name: string;
  type: "voice" | "chat";
  is_active: boolean;
  tenant_id: string;
  created_at: string;
}

interface DashboardStats {
  totalOrganizations: number;
  totalAgents: number;
  activeAgents: number;
  voiceAgents: number;
  chatAgents: number;
  recentAgents: Agent[];
  recentOrganizations: Tenant[];
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrganizations: 0,
    totalAgents: 0,
    activeAgents: 0,
    voiceAgents: 0,
    chatAgents: 0,
    recentAgents: [],
    recentOrganizations: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch tenants and agents in parallel
      const [tenantsResponse, agentsResponse] = await Promise.all([
        fetch("/api/tenants"),
        fetch("/api/agents"),
      ]);

      const tenantsData = tenantsResponse.ok
        ? await tenantsResponse.json()
        : { tenants: [] };
      const agentsData = agentsResponse.ok
        ? await agentsResponse.json()
        : { agents: [] };

      // Handle tenant data structure: API returns { tenants: [{ tenant_id, role, tenants: {...} }] }
      const tenantList = tenantsData.tenants || tenantsData || [];
      // Extract actual tenant objects from nested structure
      const tenants = tenantList.map((item: any) => {
        if (item.tenants) {
          // Nested structure from user_tenants join
          return {
            id: item.tenant_id,
            name: item.tenants.name,
            status: item.tenants.status || item.status || "active",
            created_at: item.tenants.created_at,
          };
        }
        // Direct tenant object
        return {
          id: item.id || item.tenant_id,
          name: item.name,
          status: item.status || "active",
          created_at: item.created_at,
        };
      });

      const agents = agentsData.agents || agentsData || [];

      // Calculate stats
      const activeAgents = agents.filter(
        (agent: Agent) => agent.is_active
      ).length;
      const voiceAgents = agents.filter(
        (agent: Agent) => agent.type === "voice"
      ).length;
      const chatAgents = agents.filter(
        (agent: Agent) => agent.type === "chat"
      ).length;

      // Get recent items (last 5)
      const recentAgents = agents
        .sort(
          (a: Agent, b: Agent) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        )
        .slice(0, 5);

      const recentOrganizations = tenants
        .filter((t: Tenant) => t.created_at) // Filter out items without created_at
        .sort(
          (a: Tenant, b: Tenant) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        )
        .slice(0, 5);

      setStats({
        totalOrganizations: tenants.length,
        totalAgents: agents.length,
        activeAgents,
        voiceAgents,
        chatAgents,
        recentAgents,
        recentOrganizations,
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const metricCards = [
    {
      title: "Total Organizations",
      value: stats.totalOrganizations,
      icon: "🏢",
      color: "bg-blue-500",
      description: "Active organizations",
    },
    {
      title: "Total Agents",
      value: stats.totalAgents,
      icon: "🤖",
      color: "bg-purple-500",
      description: "All agents",
    },
    {
      title: "Active Agents",
      value: stats.activeAgents,
      icon: "✅",
      color: "bg-green-500",
      description: "Currently active",
    },
    {
      title: "Voice Agents",
      value: stats.voiceAgents,
      icon: "📞",
      color: "bg-indigo-500",
      description: "Voice bots",
    },
    {
      title: "Chat Agents",
      value: stats.chatAgents,
      icon: "💬",
      color: "bg-pink-500",
      description: "Chat bots",
    },
    {
      title: "Inactive Agents",
      value: stats.totalAgents - stats.activeAgents,
      icon: "⏸️",
      color: "bg-gray-500",
      description: "Paused agents",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800 animate-pulse"
          >
            <div className="h-12 w-12 rounded-lg bg-gray-200 dark:bg-gray-700 mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {metricCards.map((metric, index) => (
          <div
            key={index}
            className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800 border border-gray-200 dark:border-white/[0.05]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`rounded-lg p-3 ${metric.color}`}>
                <span className="text-white text-xl">{metric.icon}</span>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metric.value}
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                {metric.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {metric.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Agents */}
        <ComponentCard title="Recent Agents" desc="Latest agents created">
          {stats.recentAgents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No agents yet</p>
              <Link href="/agents">
                <Button size="sm" className="mt-4">
                  Create Agent
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="max-w-full overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                    <TableRow>
                      <TableCell
                        isHeader
                        className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                      >
                        Name
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                      >
                        Type
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                      >
                        Status
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                      >
                        Created
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {stats.recentAgents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell className="px-4 py-3 text-start">
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {agent.name}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <Badge
                            size="sm"
                            color={agent.type === "voice" ? "primary" : "info"}
                          >
                            {agent.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <Badge
                            size="sm"
                            color={agent.is_active ? "success" : "error"}
                          >
                            {agent.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start text-gray-500 text-theme-sm dark:text-gray-400">
                          {new Date(agent.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="border-t border-gray-200 dark:border-white/[0.05] px-4 py-3">
                <Link href="/agents/voice">
                  <Button variant="outline" size="sm" className="w-full">
                    View All Agents
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </ComponentCard>

        {/* Recent Organizations */}
        <ComponentCard title="Recent Organizations" desc="Latest organizations">
          {stats.recentOrganizations.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No organizations yet</p>
              <Link href="/tenant-settings">
                <Button size="sm" className="mt-4">
                  Create Organization
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="max-w-full overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                    <TableRow>
                      <TableCell
                        isHeader
                        className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                      >
                        Name
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                      >
                        Status
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                      >
                        Created
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {stats.recentOrganizations.map((tenant) => (
                      <TableRow key={tenant.id}>
                        <TableCell className="px-4 py-3 text-start">
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {tenant.name}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <Badge
                            size="sm"
                            color={tenant.status === "active" ? "success" : "error"}
                          >
                            {tenant.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start text-gray-500 text-theme-sm dark:text-gray-400">
                          {new Date(tenant.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="border-t border-gray-200 dark:border-white/[0.05] px-4 py-3">
                <Link href="/tenants">
                  <Button variant="outline" size="sm" className="w-full">
                    View All Tenants
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </ComponentCard>
      </div>
    </div>
  );
}

