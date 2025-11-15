"use client";

import React, { useState, useEffect } from "react";
import { 
  CogIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  PhotoIcon,
  XMarkIcon,
  CheckIcon
} from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";

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
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tenantName, setTenantName] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchTenantData();
  }, []);

  const fetchTenantData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      // Get user's tenants
      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id, role, tenants(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!userTenants || !userTenants.tenants) {
        setError("No tenant found");
        setLoading(false);
        return;
      }

      const userTenant = userTenants as any;
      const tenantData = userTenant.tenants as Tenant;
      
      // Check if user is admin
      const admin = ['tenant_admin', 'super_admin'].includes(userTenant.role);
      setIsAdmin(admin);

      if (!admin) {
        setError("Admin access required to modify tenant settings");
        setLoading(false);
        return;
      }

      setTenant(tenantData);
      setTenantName(tenantData.name);
      setLogoPreview((tenantData.branding as any)?.logo_url || null);
      
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
          maxSubtenants: 10,
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

  const handleSaveName = async () => {
    if (!tenant || !tenantName.trim()) {
      setError("Tenant name is required");
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
      setSuccess("Tenant name updated successfully!");
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
      maxSubtenants: 10,
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
      maxSubtenants: 10,
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
  };

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
          <p className="text-gray-600 dark:text-gray-400">
            Admin access required to modify tenant settings
          </p>
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
            Tenant Configuration
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

        {/* Tenant Name */}
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
            {Object.entries(currentConfig?.features).map(([key, value]) => (
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
                    checked={value}
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
                Max Subtenants
              </label>
              <input
                type="number"
                value={currentConfig?.limits.maxSubtenants}
                onChange={(e) => setConfig({
                  ...config,
                  limits: {...currentConfig?.limits, maxSubtenants: parseInt(e.target.value)}
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
