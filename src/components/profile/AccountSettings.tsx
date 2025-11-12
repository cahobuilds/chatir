"use client";

import React from "react";
import Image from "next/image";
import Badge from "../ui/badge/Badge";
import { usePermissions } from "@/hooks/usePermissions";
import { getRoleDisplayName } from "@/lib/roles-client";
import ComponentCard from "../common/ComponentCard";
import Link from "next/link";

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
  role: Role;
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

interface AccountSettingsProps {
  profile: Profile | null;
  selectedTenant: UserTenant | null;
  onTenantChange: (tenant: UserTenant) => void;
}

export default function AccountSettings({ profile, selectedTenant, onTenantChange }: AccountSettingsProps) {
  const { roleInfo } = usePermissions(selectedTenant?.tenants.id || null);

  if (!profile) {
    return (
      <ComponentCard title="Account Settings">
        <p className="text-gray-500 dark:text-gray-400">Failed to load profile information.</p>
      </ComponentCard>
    );
  }

  const getRoleBadgeColor = (role: Role): "primary" | "success" | "info" | "warning" | "error" => {
    switch (role) {
      case "super_admin":
        return "error";
      case "tenant_admin":
        return "primary";
      case "subtenant_admin":
        return "info";
      case "agent":
        return "success";
      case "viewer":
        return "warning";
      default:
        return "light";
    }
  };

  return (
    <ComponentCard title="Account Settings">
      <div className="space-y-6">
        {/* User Profile Section */}
        <div className="flex items-start gap-4 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.name}
                  width={80}
                  height={80}
                  className="object-cover"
                />
              ) : (
                <span className="text-2xl font-semibold text-gray-500 dark:text-gray-400">
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <button className="absolute bottom-0 right-0 p-1.5 bg-blue-600 rounded-full text-white hover:bg-blue-700 transition-colors">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {profile.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {profile.email}
            </p>
            {profile.phone && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {profile.phone}
              </p>
            )}
            {selectedTenant && (
              <div className="flex items-center gap-2 mt-3">
                <Badge
                  size="sm"
                  color={getRoleBadgeColor(selectedTenant.role)}
                  variant="light"
                >
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                      {roleInfo?.displayName || getRoleDisplayName(selectedTenant.role)}
                </Badge>
                <Badge size="sm" color="light" variant="light">
                  {selectedTenant.tenants.name}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Role Description */}
        {roleInfo && (
          <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role Description
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {roleInfo.description}
            </p>
          </div>
        )}

        {/* Tenant Selector (if multiple tenants) */}
        {profile.tenants.length > 1 && (
          <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Select Tenant
            </h4>
            <div className="space-y-2">
              {profile.tenants.map((userTenant) => (
                <button
                  key={userTenant.id}
                  onClick={() => onTenantChange(userTenant)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedTenant?.id === userTenant.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {userTenant.tenants.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {getRoleDisplayName(userTenant.role)}
                      </p>
                    </div>
                    <Badge
                      size="sm"
                      color={getRoleBadgeColor(userTenant.role)}
                      variant="light"
                    >
                      {userTenant.role}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Edit Profile Link */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <Link
            href="/profile/edit"
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Edit Profile
            <svg
              className="w-4 h-4 ml-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    </ComponentCard>
  );
}

