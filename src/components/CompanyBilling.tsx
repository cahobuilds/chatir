"use client";

import React, { useEffect, useState } from "react";
import { CreditCardIcon } from "@heroicons/react/24/outline";
import { useOrganization } from "@/context/OrganizationContext";
import { usePermissions } from "@/hooks/usePermissions";
import Button from "./ui/button/Button";
import Alert from "./ui/alert/Alert";

type PlanStatus = "inactive" | "trialing" | "active" | "past_due" | "canceled";

interface TenantBillingInfo {
  billing_exempt: boolean;
  plan_status: PlanStatus;
  stripe_customer_id: string | null;
}

const STATUS_LABELS: Record<PlanStatus, string> = {
  inactive: "No subscription yet",
  trialing: "Trialing",
  active: "Active",
  past_due: "Payment failed",
  canceled: "Canceled",
};

const STATUS_DESCRIPTIONS: Record<PlanStatus, string> = {
  inactive: "You haven't completed your subscription setup yet. Start it below to create agents.",
  trialing: "You're in your 14-day free trial. Your card will be charged automatically when it ends.",
  active: "Your subscription is active. $99/month.",
  past_due: "We couldn't charge your card. Update your payment method to keep creating agents.",
  canceled: "Your subscription was canceled. Start a new one to keep creating agents.",
};

export default function CompanyBilling() {
  const { currentOrganization } = useOrganization();
  const { hasPermission } = usePermissions(currentOrganization?.id || null);
  const canManageBilling = hasPermission("billing.manage");

  const [info, setInfo] = useState<TenantBillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenant = async () => {
      if (!currentOrganization?.id) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/tenants/${currentOrganization.id}`);
        if (res.ok) {
          const data = await res.json();
          setInfo({
            billing_exempt: Boolean(data.tenant?.billing_exempt),
            plan_status: (data.tenant?.plan_status || "inactive") as PlanStatus,
            stripe_customer_id: data.tenant?.stripe_customer_id || null,
          });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchTenant();
  }, [currentOrganization?.id]);

  const handleAction = async () => {
    if (!currentOrganization?.id || !info) return;
    setRedirecting(true);
    setError(null);
    try {
      const endpoint = info.stripe_customer_id ? "/api/billing/portal" : "/api/billing/checkout";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: currentOrganization.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start billing session");
      window.location.href = data.checkout_url || data.portal_url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start billing session");
      setRedirecting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading billing…</div>;
  }

  if (!canManageBilling) {
    return (
      <div className="p-6">
        <Alert variant="info" title="No access" message="You don't have permission to manage billing for this organization." />
      </div>
    );
  }

  if (!info) {
    return (
      <div className="p-6">
        <Alert variant="error" title="Error" message="Could not load billing information." />
      </div>
    );
  }

  const buttonLabel = info.stripe_customer_id ? "Manage Billing" : "Start Subscription";

  return (
    <div className="space-y-6">
      {error && <Alert variant="error" title="Error" message={error} />}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <CreditCardIcon className="w-5 h-5" /> Subscription
        </h3>

        {info.billing_exempt ? (
          <>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Grandfathered</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This organization is exempt from billing — no payment needed.
            </p>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {STATUS_LABELS[info.plan_status]}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {STATUS_DESCRIPTIONS[info.plan_status]}
            </p>
            <Button size="sm" onClick={handleAction} disabled={redirecting}>
              {redirecting ? "Redirecting…" : buttonLabel}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
