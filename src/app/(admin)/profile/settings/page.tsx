"use client";

import React, { useState, useEffect } from "react";
import AccountSettings from "@/components/profile/AccountSettings";
import SecuritySettings from "@/components/profile/SecuritySettings";
import UserPermissions from "@/components/profile/UserPermissions";
import { getRoleInfo, type Role, type LegacyRole } from "@/lib/permissions";

interface Tenant {
  id: string;
  name: string;
  subdomain: string | null;
  tier: string;
  billing_email: string | null;
  billing_plan: string;
}

interface UserTenant {
  id: string;
  role: LegacyRole;
  status: string;
  permissions: any;
  last_login: string | null;
  created_at: string;
  tenants: Tenant;
}

interface Profile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  tenants: UserTenant[];
}

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<UserTenant | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        if (data.profile?.tenants?.length > 0) {
          setSelectedTenant(data.profile.tenants[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Refresh profile when returning from edit page or when URL changes
  useEffect(() => {
    const handleFocus = () => {
      fetchProfile();
    };
    window.addEventListener('focus', handleFocus);
    
    // Also refresh when URL has updated parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('updated')) {
      fetchProfile();
      // Clean up URL
      window.history.replaceState({}, '', '/profile/settings');
    }
    
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Account Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your account settings and view your roles and permissions
          </p>
        </div>
      </div>

      {/* Account Settings and Security */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AccountSettings 
          profile={profile}
          selectedTenant={selectedTenant}
          onTenantChange={setSelectedTenant}
        />
        {profile && <SecuritySettings email={profile.email} phone={profile.phone} />}
      </div>

      {/* Permissions Section - Full Width */}
      {selectedTenant && (
        <UserPermissions tenantId={selectedTenant.tenants.id} />
      )}
    </div>
  );
}

