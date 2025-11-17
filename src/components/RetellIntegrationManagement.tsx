"use client";

import React, { useState, useEffect } from "react";
import { 
  LinkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon
} from "@heroicons/react/24/outline";
import Button from "./ui/button/Button";
import Input from "./form/input/InputField";
import Label from "./form/Label";
import Alert from "./ui/alert/Alert";
import Select from "./form/Select";
import { createClient } from "@/lib/supabase/client";

interface Tenant {
  id: string;
  name: string;
}

interface RetellConnectionStatus {
  status: 'disconnected' | 'connected' | 'error' | 'syncing';
  tenant_id?: string | null;
  connected_at?: string | null;
  last_sync_at?: string | null;
  has_api_key: boolean;
}

export default function RetellIntegrationManagement() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [connectionStatus, setConnectionStatus] = useState<RetellConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [retellTenantId, setRetellTenantId] = useState("");

  const supabase = createClient();

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      fetchConnectionStatus();
    } else {
      setConnectionStatus(null);
    }
  }, [selectedTenantId]);

  const fetchTenants = async () => {
    try {
      setLoadingTenants(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        return;
      }

      // Fetch all tenants (system admin can see all)
      const response = await fetch('/api/tenants');
      if (response.ok) {
        const data = await response.json();
        setTenants(data.tenants || []);
        if (data.tenants && data.tenants.length > 0 && !selectedTenantId) {
          setSelectedTenantId(data.tenants[0].id);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to fetch tenants");
      }
    } catch (err: any) {
      console.error("Failed to fetch tenants:", err);
      setError(err.message || "Failed to fetch tenants");
    } finally {
      setLoadingTenants(false);
      setLoading(false);
    }
  };

  const fetchConnectionStatus = async () => {
    if (!selectedTenantId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/tenants/${selectedTenantId}/retell/connect`);
      
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data.connection);
      } else {
        const errorData = await response.json();
        if (response.status === 403) {
          setError("System admin access required");
        } else {
          setError(errorData.error || "Failed to fetch connection status");
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch connection status:", err);
      setError(err.message || "Failed to fetch connection status");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedTenantId) {
      setError("Please select an organization");
      return;
    }

      if (!apiKey.trim()) {
        setError("Voice provider API key is required");
        return;
      }

    setConnecting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/tenants/${selectedTenantId}/retell/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          retell_api_key: apiKey.trim(),
          retell_tenant_id: retellTenantId.trim() || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message || "Successfully connected to voice provider");
        setShowApiKeyInput(false);
        setApiKey("");
        setRetellTenantId("");
        await fetchConnectionStatus();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to connect to voice provider");
        await fetchConnectionStatus();
      }
    } catch (err: any) {
      console.error("Failed to connect to voice provider:", err);
      setError(err.message || "Failed to connect to voice provider");
      await fetchConnectionStatus();
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!selectedTenantId) {
      setError("Please select an organization");
      return;
    }

    if (!confirm("Are you sure you want to disconnect this organization from the voice provider? This will not delete the API key, but will disconnect the connection.")) {
      return;
    }

    setConnecting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/tenants/${selectedTenantId}/retell/connect`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message || "Disconnected from voice provider");
        await fetchConnectionStatus();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to disconnect from voice provider");
      }
    } catch (err: any) {
      console.error("Failed to disconnect from voice provider:", err);
      setError(err.message || "Failed to disconnect from voice provider");
    } finally {
      setConnecting(false);
    }
  };

  const handleSyncBilling = async () => {
    if (!selectedTenantId) {
      setError("Please select an organization");
      return;
    }

    setSyncing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/tenants/${selectedTenantId}/retell/billing`);

      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message || "Billing data synced successfully");
        await fetchConnectionStatus();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to sync billing data");
      }
    } catch (err: any) {
      console.error("Failed to sync billing:", err);
      setError(err.message || "Failed to sync billing data");
    } finally {
      setSyncing(false);
    }
  };

  const getStatusIcon = () => {
    if (!connectionStatus) return null;
    
    switch (connectionStatus.status) {
      case 'connected':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'syncing':
        return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <XCircleIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    if (!connectionStatus) return "Unknown";
    
    switch (connectionStatus.status) {
      case 'connected':
        return "Connected";
      case 'error':
        return "Connection Error";
      case 'syncing':
        return "Syncing...";
      default:
        return "Disconnected";
    }
  };

  if (loadingTenants) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <LinkIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Voice Provider Integration
          </h3>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage voice provider connections for organizations. This allows organizations to use voice agents.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Error/Success Messages */}
        {error && (
          <Alert
            variant="error"
            title="Error"
            message={error}
          />
        )}
        {success && (
          <Alert
            variant="success"
            title="Success"
            message={success}
          />
        )}

        {/* Organization Selection */}
        <div>
          <Label htmlFor="tenant_select">
            Organization
          </Label>
          <Select
            id="tenant_select"
            value={selectedTenantId}
            onChange={(value) => setSelectedTenantId(value)}
            disabled={loadingTenants}
            className="mt-1"
            placeholder="Select an organization..."
            options={tenants.map((tenant) => ({
              value: tenant.id,
              label: tenant.name,
            }))}
          />
        </div>

        {selectedTenantId && (
          <>
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center space-x-3">
                {getStatusIcon()}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Status: {getStatusText()}
                  </p>
                  {connectionStatus?.connected_at && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Connected on {new Date(connectionStatus.connected_at).toLocaleDateString()}
                    </p>
                  )}
                  {connectionStatus?.last_sync_at && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Last synced: {new Date(connectionStatus.last_sync_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              {connectionStatus?.status === 'connected' && (
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSyncBilling}
                    disabled={syncing}
                  >
                    <ArrowPathIcon className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? "Syncing..." : "Sync Billing"}
                  </Button>
                </div>
              )}
            </div>

            {/* Connection Form */}
            {connectionStatus?.status !== 'connected' ? (
              <div className="space-y-4">
                {!showApiKeyInput ? (
                  <Button
                    onClick={() => setShowApiKeyInput(true)}
                    size="sm"
                  >
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Connect Voice Provider
                  </Button>
                ) : (
                  <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div>
                      <Label htmlFor="voice_api_key">
                        Voice Provider API Key <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="password"
                        id="voice_api_key"
                        placeholder="Enter API key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        disabled={connecting}
                        className="mt-1"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Enter the voice provider API key for this organization
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="voice_tenant_id">
                        Provider Tenant ID (Optional)
                      </Label>
                      <Input
                        type="text"
                        id="voice_tenant_id"
                        placeholder="Enter tenant/organization ID"
                        value={retellTenantId}
                        onChange={(e) => setRetellTenantId(e.target.value)}
                        disabled={connecting}
                        className="mt-1"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Optional: Provider tenant/organization ID for tracking billing
                      </p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Button
                        onClick={handleConnect}
                        disabled={connecting || !apiKey.trim()}
                        size="sm"
                      >
                        {connecting ? "Connecting..." : "Connect"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowApiKeyInput(false);
                          setApiKey("");
                          setRetellTenantId("");
                          setError(null);
                        }}
                        disabled={connecting}
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {connectionStatus.tenant_id && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Provider Tenant ID:</strong> {connectionStatus.tenant_id}
                    </p>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    disabled={connecting}
                    size="sm"
                  >
                    <XCircleIcon className="w-4 h-4 mr-2" />
                    Disconnect
                  </Button>
                </div>

                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        Billing Sync
                      </p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        Use the "Sync Billing" button above to sync billing data from the voice provider. 
                        This will update the organization's billing records with the latest usage and costs.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

