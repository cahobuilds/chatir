"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/context/OrganizationContext";
import { createClient } from "@/lib/supabase/client";
import ChatHistoryFilters from "@/components/ChatHistoryFilters";
import ChatHistoryTable from "@/components/ChatHistoryTable";

export default function ChatHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const { currentOrganization } = useOrganization();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [filters, setFilters] = useState<{
    tenant_id?: string;
    agent_id?: string;
    status?: string;
    dateRange?: string;
    searchQuery?: string;
  }>({});
  const supabase = createClient();

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user || !currentOrganization?.id) {
        setCheckingAdmin(false);
        return;
      }

      try {
        // Check if user is admin (tenant_admin, super_admin, or system_admin)
        const { data: userTenant } = await supabase
          .from('user_tenants')
          .select('role')
          .eq('user_id', user.id)
          .eq('tenant_id', currentOrganization.id)
          .eq('status', 'active')
          .single();

        if (userTenant) {
          const isAdminRole = ['tenant_admin', 'super_admin', 'system_admin'].includes(userTenant.role);
          setIsAdmin(isAdminRole);
          
          if (!isAdminRole) {
            // Redirect to dashboard if not admin
            router.push('/dashboard');
          }
        } else {
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error checking admin access:', error);
        router.push('/dashboard');
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdminAccess();
  }, [user, currentOrganization, router, supabase]);

  if (authLoading || checkingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Chat History & Conversations
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Complete chat conversation log with transcripts and analytics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
            Export Data
          </button>
          <button className="rounded-lg bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700">
            Advanced Search
          </button>
        </div>
      </div>

      {/* Filters */}
      <ChatHistoryFilters onFiltersChange={setFilters} />

      {/* Main Content */}
      <ChatHistoryTable filters={filters} />
    </div>
  );
}

