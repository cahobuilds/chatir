"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/context/OrganizationContext";
import CallHistoryFilters from "@/components/CallHistoryFilters";
import CallHistoryTable from "@/components/CallHistoryTable";
import { createClient } from "@/lib/supabase/client";

// Auto-poll interval in milliseconds (60 seconds)
const AUTO_POLL_INTERVAL = 60 * 1000;

export default function CallHistoryPage() {
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
  const [autoPolling, setAutoPolling] = useState(true);
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null);
  const [newCallsCount, setNewCallsCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  // Incremental sync - polls for new calls without full database sync
  const performIncrementalSync = useCallback(async () => {
    if (!currentOrganization?.id || syncing) return;

    try {
      const response = await fetch('/api/retell/calls/sync-incremental', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenant_id: currentOrganization.id,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.synced > 0) {
        setNewCallsCount(prev => prev + data.synced);
        // Trigger table refresh
        setRefreshKey(prev => prev + 1);
        console.log(`[Auto-Poll] Synced ${data.synced} new calls`);
      }
      
      setLastPollTime(new Date());
    } catch (error) {
      console.error('[Auto-Poll] Error:', error);
    }
  }, [currentOrganization?.id, syncing]);

  // Set up auto-polling
  useEffect(() => {
    if (!isAdmin || !currentOrganization?.id || !autoPolling) {
      return;
    }

    // Initial poll after 5 seconds
    const initialPoll = setTimeout(() => {
      performIncrementalSync();
    }, 5000);

    // Set up recurring poll
    pollIntervalRef.current = setInterval(() => {
      performIncrementalSync();
    }, AUTO_POLL_INTERVAL);

    return () => {
      clearTimeout(initialPoll);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isAdmin, currentOrganization?.id, autoPolling, performIncrementalSync]);

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

  // Full database sync (for initial sync or catching up)
  const handleFullSync = async () => {
    if (!currentOrganization?.id || syncing) return;

    setSyncing(true);
    setSyncResult(null);

    try {
      // Calculate date range (last 30 days by default)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const response = await fetch('/api/retell/calls/sync', {
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
        throw new Error(data.error || 'Failed to sync calls');
      }

      setSyncResult({
        success: true,
        message: `Successfully synced ${data.synced || 0} calls. ${data.skipped || 0} skipped.`,
      });

      // Trigger table refresh
      setRefreshKey(prev => prev + 1);
      setNewCallsCount(0);
    } catch (error: any) {
      setSyncResult({
        success: false,
        message: error.message || 'Failed to sync calls',
      });
    } finally {
      setSyncing(false);
    }
  };

  // Quick refresh - just refreshes the table data from local DB
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setNewCallsCount(0);
  };

  // Toggle auto-polling
  const toggleAutoPolling = () => {
    setAutoPolling(prev => !prev);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Call History & Recordings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Complete call log with recordings, transcripts, and analytics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Auto-polling indicator */}
          <div className="flex items-center space-x-2 text-sm">
            <button
              onClick={toggleAutoPolling}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition-colors ${
                autoPolling 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              }`}
              title={autoPolling ? 'Auto-refresh is ON (every 60s)' : 'Auto-refresh is OFF'}
            >
              <div className={`w-2 h-2 rounded-full ${autoPolling ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span>{autoPolling ? 'Live' : 'Paused'}</span>
            </button>
            {lastPollTime && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Updated {lastPollTime.toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* New calls badge */}
          {newCallsCount > 0 && (
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-sm animate-pulse"
            >
              <span>{newCallsCount} new call{newCallsCount > 1 ? 's' : ''}</span>
              <span>- Click to view</span>
            </button>
          )}

          {/* Full Sync Button */}
          <button
            onClick={handleFullSync}
            disabled={syncing || !currentOrganization?.id}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            title="Full sync from Retell API (last 30 days)"
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
      <CallHistoryFilters onFiltersChange={setFilters} />

      {/* Main Content */}
      <CallHistoryTable key={refreshKey} filters={filters} />
    </div>
  );
}
