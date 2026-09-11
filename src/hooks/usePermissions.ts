// Client-side hook for fetching permissions from server
// This hook fetches permission data from the API (server-side)
// Use this for displaying user permissions in UI components

"use client";

import { useState, useEffect } from 'react';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface RolePermissions {
  role: string;
  displayName: string;
  description: string;
  permissions: Permission[];
}

interface UsePermissionsResult {
  permissions: Permission[];
  roleInfo: RolePermissions | null;
  loading: boolean;
  error: string | null;
  hasPermission: (permissionId: string) => boolean;
  refetch: () => Promise<void>;
}

export function usePermissions(tenantId: string | null): UsePermissionsResult {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roleInfo, setRoleInfo] = useState<RolePermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/permissions/check?tenant_id=${tenantId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }

      const data = await response.json();
      setPermissions(data.permissions || []);
      setRoleInfo(data.role_info || null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch permissions');
      setPermissions([]);
      setRoleInfo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [tenantId]);

  // Callers pass a permission name ("billing.manage"). The API returns rows from the
  // permissions table, whose `id` is a UUID, so match on `name` as well as `id`.
  const hasPermission = (permissionId: string): boolean => {
    return permissions.some(p => p.name === permissionId || p.id === permissionId);
  };

  return {
    permissions,
    roleInfo,
    loading,
    error,
    hasPermission,
    refetch: fetchPermissions,
  };
}

