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
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user || !currentOrganization?.id) {
        setCheckingAdmin(false);
        return;
      }

      try {
        // Check if user is admin (tenant_admin, super_admin, system_admin, organization_admin, or manager)
        const { data: userTenant } = await supabase
          .from('user_tenants')
          .select('role')
          .eq('user_id', user.id)
          .eq('tenant_id', currentOrganization.id)
          .eq('status', 'active')
          .single();

        if (userTenant) {
          const isAdminRole = ['tenant_admin', 'super_admin', 'system_admin', 'organization_admin', 'manager'].includes(userTenant.role);
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

  const handleSync = async () => {
    if (!currentOrganization?.id || syncing) return;

    setSyncing(true);
    setSyncResult(null);

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const response = await fetch('/api/retell/chats/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          tenant_id: currentOrganization.id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          limit: 1000,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync chats');
      }

      setSyncResult({
        success: true,
        message: `Successfully synced ${data.synced || 0} chats. ${data.skipped || 0} skipped.`,
      });

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      setSyncResult({
        success: false,
        message: error.message || 'Failed to sync chats',
      });
    } finally {
      setSyncing(false);
    }
  };

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
          <button
            onClick={handleSync}
            disabled={syncing || !currentOrganization?.id}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {syncing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Database Sync</span>
              </>
            )}
          </button>
          <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
            Export Data
          </button>
          <button className="rounded-lg bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700">
            Advanced Search
          </button>
        </div>
      </div>

      {/* Sync Result Message */}
      {syncResult && (
        <div
          className={`rounded-lg p-4 ${
            syncResult.success
              ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>{syncResult.message}</span>
            <button
              onClick={() => setSyncResult(null)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <ChatHistoryFilters onFiltersChange={setFilters} />

      {/* Main Content */}
      <ChatHistoryTable filters={filters} />
    </div>
  );
}

