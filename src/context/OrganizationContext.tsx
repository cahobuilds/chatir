"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Organization {
  id: string;
  name: string;
  subdomain: string | null;
  role: string;
  tier?: string;
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  loading: boolean;
  switchOrganization: (organizationId: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const ORGANIZATION_COOKIE_NAME = "current_organization_id";

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  // Fetch user's organizations
  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setOrganizations([]);
        setCurrentOrganization(null);
        setLoading(false);
        return;
      }

      // Get user's tenant memberships
      const { data: userTenants, error } = await supabase
        .from("user_tenants")
        .select(`
          tenant_id,
          role,
          status,
          tenants (
            id,
            name,
            subdomain,
            tier
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "active");

      if (error) {
        console.error("Error fetching organizations:", error);
        setOrganizations([]);
        setCurrentOrganization(null);
        setLoading(false);
        return;
      }

      // Transform data
      const orgs: Organization[] = (userTenants || []).map((ut: any) => ({
        id: ut.tenant_id,
        name: (ut.tenants as any)?.name || "Unknown",
        subdomain: (ut.tenants as any)?.subdomain || null,
        role: ut.role,
        tier: (ut.tenants as any)?.tier || "standard",
      }));

      setOrganizations(orgs);

      // Get current organization from cookie or use first one
      const currentOrgId = getCookie(ORGANIZATION_COOKIE_NAME);
      let selectedOrg = orgs.find((org) => org.id === currentOrgId) || orgs[0] || null;

      // If superadmin/system_admin, they can access all organizations
      // For now, we'll show all their organizations. Later we can add "all orgs" option
      setCurrentOrganization(selectedOrg);
      
      // Set cookie if we have an organization
      if (selectedOrg) {
        setCookie(ORGANIZATION_COOKIE_NAME, selectedOrg.id, 365);
      }
    } catch (error) {
      console.error("Error in fetchOrganizations:", error);
      setOrganizations([]);
      setCurrentOrganization(null);
    } finally {
      setLoading(false);
    }
  };

  // Switch to a different organization
  const switchOrganization = async (organizationId: string) => {
    // Check if user has access to this organization
    const org = organizations.find((o) => o.id === organizationId);
    
    // If not in list, check if user is superadmin (they can access all)
    if (!org) {
      const isSuperAdmin = organizations.some(o => o.role === 'system_admin' || o.role === 'super_admin');
      if (isSuperAdmin) {
        // Superadmin can switch to any organization - call API to verify
        try {
          const response = await fetch('/api/organization/switch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ organizationId }),
          });
          
          if (response.ok) {
            const data = await response.json();
            setCurrentOrganization(data.organization);
            setCookie(ORGANIZATION_COOKIE_NAME, organizationId, 365);
            router.refresh();
            return;
          }
        } catch (error) {
          console.error("Error switching organization:", error);
          return;
        }
      }
      
      console.error("Organization not found or no access:", organizationId);
      return;
    }

    // Update cookie via API to ensure server-side sync
    try {
      await fetch('/api/organization/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });
    } catch (error) {
      console.error("Error updating organization context:", error);
    }

    setCurrentOrganization(org);
    setCookie(ORGANIZATION_COOKIE_NAME, organizationId, 365);
    
    // Refresh the page to update all components with new organization context
    router.refresh();
  };

  // Refresh organizations list
  const refreshOrganizations = async () => {
    await fetchOrganizations();
  };

  // Initialize on mount
  useEffect(() => {
    fetchOrganizations();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchOrganizations();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        organizations,
        loading,
        switchOrganization,
        refreshOrganizations,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}

// Cookie helper functions
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

function setCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

