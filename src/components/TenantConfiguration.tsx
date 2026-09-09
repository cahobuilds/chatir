"use client";

import React, { useState, useEffect } from "react";
import { 
  CogIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  PhotoIcon,
  XMarkIcon,
  CheckIcon,
  ClipboardDocumentIcon
} from "@heroicons/react/24/outline";
import { useOrganization } from "@/context/OrganizationContext";

interface Tenant {
  id: string;
  name: string;
  branding: {
    logo_url?: string;
    primaryColor?: string;
    secondaryColor?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export default function TenantConfiguration() {
  const { currentOrganization, loading: orgLoading } = useOrganization();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tenantName, setTenantName] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [wordmarkPreview, setWordmarkPreview] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [copiedTenantId, setCopiedTenantId] = useState(false);

  useEffect(() => {
    // Wait for the org context to settle so a still-loading context is not mistaken
    // for a user with no organization.
    if (orgLoading) return;
    fetchTenantData();
  }, [currentOrganization?.id, orgLoading]);

  const fetchTenantData = async () => {
    try {
      setLoading(true);

      // The current organization comes from the shared org switcher context, so this
      // component always reads and writes the same tenant as the rest of the page.
      if (!currentOrganization?.id) {
        setError("No organization found. Please ensure you are associated with an organization.");
        setLoading(false);
        setIsAdmin(false);
        return;
      }

      // Fetch the sanitized tenant (never includes retell_api_key -- see sanitizeTenant() in
      // src/app/api/tenants/[id]/route.ts) and this user's role through the API layer, instead
      // of querying `tenants` directly from client-side JS.
      const [tenantRes, permsRes] = await Promise.all([
        fetch(`/api/tenants/${currentOrganization.id}`),
        fetch(`/api/permissions/check?tenant_id=${currentOrganization.id}`),
      ]);

      if (!tenantRes.ok) {
        const errData = await tenantRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load organization");
      }
      const { tenant: tenantData } = (await tenantRes.json()) as { tenant: Tenant };

      const permsData = permsRes.ok ? await permsRes.json() : { role_info: null };
      const roleName: string | undefined = permsData.role_info?.role;
      const roleScope: string | undefined = permsData.role_info?.scope;
      const admin = roleName === 'company_admin' || roleScope === 'platform';
      setIsAdmin(admin);

      if (!admin) {
        setError(`Admin access required. Your current role is: ${roleName || 'unknown'}. You need the Company Admin role to modify organization settings.`);
        setLoading(false);
        return;
      }

      // Retell/voice-provider key management is platform-only (see
      // docs/ROLE_PERMISSION_CLEANUP_PLAN.md, Locked Decision #2) -- it is never fetched,
      // shown, or editable from this company-facing settings screen. Platform staff manage it
      // via RetellIntegrationManagement instead.

      setTenant(tenantData);
      setTenantName(tenantData.name);
      setLogoPreview((tenantData.branding as any)?.logo_url || null);
      setWordmarkPreview((tenantData.branding as any)?.wordmark_url || null);

      // Initialize config state
      setConfig({
        branding: {
          logo: (tenantData.branding as any)?.logo_url || "",
          primaryColor: (tenantData.branding as any)?.primaryColor || "#4F46E5",
          secondaryColor: (tenantData.branding as any)?.secondaryColor || "#06B6D4",
          favicon: (tenantData.branding as any)?.favicon || "",
          customDomain: (tenantData.branding as any)?.customDomain || "",
          customCSS: (tenantData.branding as any)?.customCSS || ""
        },
        features: tenantData.settings?.features || {
          voiceAgents: true,
          chatAgents: true,
          callRecording: true,
          analytics: true,
          integrations: true,
          customWorkflows: false,
          whiteLabel: false
        },
        limits: tenantData.settings?.limits || {
          maxAgents: 50,
          maxConcurrentCalls: 100,
          maxWorkspaces: 10,
          storageLimit: "100GB",
          apiRateLimit: 1000
        },
        security: tenantData.settings?.security || {
          twoFactorAuth: false,
          ssoEnabled: false,
          ipWhitelist: []
        }
      });
      
      setLoading(false);
    } catch (err: any) {
      console.error("Error fetching tenant:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !tenant) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size exceeds 5MB limit");
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/tenants/${tenant.id}/logo`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      setLogoPreview(data.logo_url);
      setSuccess("Logo uploaded successfully!");
      
      // Refresh tenant data
      await fetchTenantData();
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!tenant) return;

    if (!confirm("Are you sure you want to delete the logo?")) return;

    try {
      setUploading(true);
      setError(null);

      const response = await fetch(`/api/tenants/${tenant.id}/logo`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
      }

      setLogoPreview(null);
      setSuccess("Logo deleted successfully!");
      
      // Refresh tenant data
      await fetchTenantData();
    } catch (err: any) {
      console.error("Delete error:", err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleWordmarkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !tenant) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size exceeds 5MB limit");
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/tenants/${tenant.id}/wordmark`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      setWordmarkPreview(data.wordmark_url);
      setSuccess("Wordmark uploaded successfully!");
      
      // Refresh tenant data
      await fetchTenantData();
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteWordmark = async () => {
    if (!tenant) return;

    if (!confirm("Are you sure you want to delete the wordmark?")) return;

    try {
      setUploading(true);
      setError(null);

      const response = await fetch(`/api/tenants/${tenant.id}/wordmark`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
      }

      setWordmarkPreview(null);
      setSuccess("Wordmark deleted successfully!");
      
      // Refresh tenant data
      await fetchTenantData();
    } catch (err: any) {
      console.error("Delete error:", err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveName = async () => {
    if (!tenant || !tenantName.trim()) {
      setError("Organization name is required");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: tenantName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Update failed');
      }

      const data = await response.json();
      setTenant(data.tenant);
      setSuccess("Organization name updated successfully!");
    } catch (err: any) {
      console.error("Update error:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Use config state, fallback to computed if not set
  const currentConfig = config || (tenant ? {
    branding: {
      logo: (tenant.branding as any)?.logo_url || "",
      primaryColor: (tenant.branding as any)?.primaryColor || "#4F46E5",
      secondaryColor: (tenant.branding as any)?.secondaryColor || "#06B6D4",
      favicon: (tenant.branding as any)?.favicon || "",
      customDomain: (tenant.branding as any)?.customDomain || "",
      customCSS: (tenant.branding as any)?.customCSS || ""
    },
    features: tenant.settings?.features || {
      voiceAgents: true,
      chatAgents: true,
      callRecording: true,
      analytics: true,
      integrations: true,
      customWorkflows: false,
      whiteLabel: false
    },
    limits: tenant.settings?.limits || {
      maxAgents: 50,
      maxConcurrentCalls: 100,
      maxWorkspaces: 10,
      storageLimit: "100GB",
      apiRateLimit: 1000
    },
    security: tenant.settings?.security || {
      ssoEnabled: false,
      mfaRequired: true,
      sessionTimeout: 480,
      ipWhitelist: "",
      auditLogging: true
    }
  } : {
    branding: {
      logo: "",
      primaryColor: "#4F46E5",
      secondaryColor: "#06B6D4",
      favicon: "",
      customDomain: "",
      customCSS: ""
    },
    features: {
      voiceAgents: true,
      chatAgents: true,
      callRecording: true,
      analytics: true,
      integrations: true,
      customWorkflows: false,
      whiteLabel: false
    },
    limits: {
      maxAgents: 50,
      maxConcurrentCalls: 100,
      maxWorkspaces: 10,
      storageLimit: "100GB",
      apiRateLimit: 1000
    },
    security: {
      ssoEnabled: false,
      mfaRequired: true,
      sessionTimeout: 480,
      ipWhitelist: "",
      auditLogging: true
    }
  });

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-8">
          <ShieldCheckIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Admin Access Required
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You need the Company Admin role to modify organization settings.
          </p>
          {error && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-left">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {error}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <CogIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Organization Configuration
          </h3>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center space-x-2">
            <CheckIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
          </div>
        )}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center space-x-2">
            <XMarkIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Organization Name */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <GlobeAltIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Organization Name
            </h4>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Enter organization name"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={handleSaveName}
              disabled={saving || !tenantName.trim()}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Name"}
            </button>
          </div>
          {/* Tenant ID Display */}
          {tenant && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                Tenant ID: {tenant.id}
              </span>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(tenant.id);
                  setCopiedTenantId(true);
                  setTimeout(() => setCopiedTenantId(false), 2000);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Copy tenant ID"
              >
                {copiedTenantId ? (
                  <CheckIcon className="w-3 h-3 text-green-600 dark:text-green-400" />
                ) : (
                  <ClipboardDocumentIcon className="w-3 h-3" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Branding Settings */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <PaintBrushIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Branding & Customization
            </h4>
          </div>
          
          <div className="space-y-4">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Organization Logo
              </label>
              <div className="flex items-start space-x-4">
                {/* Logo Preview */}
                <div className="flex-shrink-0">
                  {logoPreview ? (
                    <div className="relative">
                      <img
                        src={logoPreview}
                        alt="Tenant logo"
                        className="w-24 h-24 object-contain border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700"
                      />
                      <button
                        onClick={handleDeleteLogo}
                        disabled={uploading}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50"
                        title="Delete logo"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-700">
                      <PhotoIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                
                {/* Upload Button */}
                <div className="flex-1">
                  <label className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600">
                    <PhotoIcon className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {uploading ? "Uploading..." : logoPreview ? "Change Logo" : "Upload Logo"}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Supported formats: JPEG, PNG, GIF, WebP, SVG. Max size: 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* Wordmark Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Organization Wordmark
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Wordmark appears next to the logo when the sidebar is expanded. Use a horizontal text-based logo or brand name image.
              </p>
              <div className="flex items-start space-x-4">
                {/* Wordmark Preview */}
                <div className="flex-shrink-0">
                  {wordmarkPreview ? (
                    <div className="relative">
                      <img
                        src={wordmarkPreview}
                        alt="Tenant wordmark"
                        className="h-12 w-auto max-w-[200px] object-contain border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 p-2"
                      />
                      <button
                        onClick={handleDeleteWordmark}
                        disabled={uploading}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50"
                        title="Delete wordmark"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-12 w-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-700">
                      <PhotoIcon className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
                
                {/* Upload Button */}
                <div className="flex-1">
                  <label className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600">
                    <PhotoIcon className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {uploading ? "Uploading..." : wordmarkPreview ? "Change Wordmark" : "Upload Wordmark"}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                      onChange={handleWordmarkUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Supported formats: JPEG, PNG, GIF, WebP, SVG. Max size: 5MB. Recommended: Horizontal layout, transparent background.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={currentConfig?.branding.primaryColor}
                    onChange={(e) => setConfig({
                      ...config,
                      branding: {...currentConfig?.branding, primaryColor: e.target.value}
                    })}
                    className="w-10 h-10 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                  <input
                    type="text"
                    value={currentConfig?.branding.primaryColor}
                    onChange={(e) => setConfig({
                      ...config,
                      branding: {...currentConfig?.branding, primaryColor: e.target.value}
                    })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Secondary Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={currentConfig?.branding.secondaryColor}
                    onChange={(e) => setConfig({
                      ...config,
                      branding: {...currentConfig?.branding, secondaryColor: e.target.value}
                    })}
                    className="w-10 h-10 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                  <input
                    type="text"
                    value={currentConfig?.branding.secondaryColor}
                    onChange={(e) => setConfig({
                      ...config,
                      branding: {...currentConfig?.branding, secondaryColor: e.target.value}
                    })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Custom Domain
              </label>
              <input
                type="text"
                value={currentConfig?.branding.customDomain}
                onChange={(e) => setConfig({
                  ...config,
                  branding: {...currentConfig?.branding, customDomain: e.target.value}
                })}
                placeholder="tenant.example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Custom CSS
              </label>
              <textarea
                value={currentConfig?.branding.customCSS}
                onChange={(e) => setConfig({
                  ...config,
                  branding: {...currentConfig?.branding, customCSS: e.target.value}
                })}
                rows={4}
                placeholder="/* Custom CSS styles */"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <GlobeAltIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Feature Configuration
            </h4>
          </div>
          
          <div className="space-y-4">
            {Object.entries(currentConfig?.features || {}).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {getFeatureDescription(key)}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!value}
                    onChange={(e) => setConfig({
                      ...config,
                      features: {...currentConfig?.features, [key]: e.target.checked}
                    })}
                    className="sr-only peer"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Resource Limits */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <ShieldCheckIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Resource Limits
            </h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Agents
              </label>
              <input
                type="number"
                value={currentConfig?.limits.maxAgents}
                onChange={(e) => setConfig({
                  ...config,
                  limits: {...currentConfig?.limits, maxAgents: parseInt(e.target.value)}
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Concurrent Calls
              </label>
              <input
                type="number"
                value={currentConfig?.limits.maxConcurrentCalls}
                onChange={(e) => setConfig({
                  ...config,
                  limits: {...currentConfig?.limits, maxConcurrentCalls: parseInt(e.target.value)}
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Workspaces
              </label>
              <input
                type="number"
                value={currentConfig?.limits.maxWorkspaces}
                onChange={(e) => setConfig({
                  ...config,
                  limits: {...currentConfig?.limits, maxWorkspaces: parseInt(e.target.value)}
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Rate Limit (per hour)
              </label>
              <input
                type="number"
                value={currentConfig?.limits.apiRateLimit}
                onChange={(e) => setConfig({
                  ...config,
                  limits: {...currentConfig?.limits, apiRateLimit: parseInt(e.target.value)}
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <ShieldCheckIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Security Settings
            </h4>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  SSO Integration
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enable single sign-on authentication
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentConfig?.security.ssoEnabled}
                  onChange={(e) => setConfig({
                    ...config,
                    security: {...currentConfig?.security, ssoEnabled: e.target.checked}
                  })}
                  className="sr-only peer"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  MFA Required
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Require multi-factor authentication
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentConfig?.security.mfaRequired}
                  onChange={(e) => setConfig({
                    ...config,
                    security: {...currentConfig?.security, mfaRequired: e.target.checked}
                  })}
                  className="sr-only peer"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={currentConfig?.security.sessionTimeout}
                onChange={(e) => setConfig({
                  ...config,
                  security: {...currentConfig?.security, sessionTimeout: parseInt(e.target.value)}
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <button className="w-full inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            <CogIcon className="w-4 h-4 mr-2" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

function getFeatureDescription(key: string): string {
  const descriptions: Record<string, string> = {
    voiceAgents: "Enable AI voice agents for phone calls",
    chatAgents: "Enable AI chat agents for messaging",
    callRecording: "Record and store call conversations",
    analytics: "Access to analytics and reporting",
    integrations: "Connect with external services",
    customWorkflows: "Create custom call flow workflows",
    whiteLabel: "Remove branding and customize appearance"
  };
  return descriptions[key] || "Feature description";
}
