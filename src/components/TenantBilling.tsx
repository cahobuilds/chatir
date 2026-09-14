"use client";

import React, { useState, useEffect } from "react";
import { CreditCardIcon } from "@heroicons/react/24/outline";
import Alert from "./ui/alert/Alert";
import Button from "./ui/button/Button";

type PlanStatus = "inactive" | "trialing" | "active" | "past_due" | "canceled";

const STATUS_OPTIONS: PlanStatus[] = ["inactive", "trialing", "active", "past_due", "canceled"];

interface TenantBillingInfo {
  billing_exempt: boolean;
  plan_status: PlanStatus;
  stripe_customer_id: string | null;
}

export default function TenantBilling() {
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [info, setInfo] = useState<TenantBillingInfo | null>(null);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const res = await fetch("/api/tenants");
        if (res.ok) {
          const data = await res.json();
          const tenantsList: { tenant_id?: string; name?: string; tenants?: { id?: string; name?: string } }[] = data.tenants || [];
          const formattedTenants = tenantsList
            .map((t) => ({ id: t.tenant_id || t.tenants?.id, name: t.tenants?.name || t.name }))
            .filter((t): t is { id: string; name: string } => Boolean(t.id && t.name));
          setTenants(formattedTenants);
          if (formattedTenants.length > 0) {
            setSelectedTenantId(formattedTenants[0].id);
          }
        }
      } catch (err) {
        console.error("[TenantBilling] Failed to fetch tenants:", err);
      } finally {
        setTenantsLoading(false);
      }
    };
    fetchTenants();
  }, []);

  useEffect(() => {
    const fetchSelectedTenant = async () => {
      if (!selectedTenantId) return;
      try {
        const res = await fetch(`/api/tenants/${selectedTenantId}`);
        if (res.ok) {
          const data = await res.json();
          setInfo({
            billing_exempt: Boolean(data.tenant?.billing_exempt),
            plan_status: (data.tenant?.plan_status || "inactive") as PlanStatus,
            stripe_customer_id: data.tenant?.stripe_customer_id || null,
          });
        }
      } catch (err) {
        console.error("[TenantBilling] Failed to fetch selected tenant:", err);
      }
    };
    fetchSelectedTenant();
  }, [selectedTenantId]);

  const handleToggleExempt = async () => {
    if (!selectedTenantId || !info) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/tenants/${selectedTenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billing_exempt: !info.billing_exempt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update billing exemption");
      setInfo({ ...info, billing_exempt: !info.billing_exempt });
      setSuccess("Billing exemption updated.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update billing exemption");
    } finally {
      setSaving(false);
    }
  };

  const handleChangeStatus = async (status: PlanStatus) => {
    if (!selectedTenantId || !info) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/tenants/${selectedTenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_status: status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update plan status");
      setInfo({ ...info, plan_status: status });
      setSuccess(`Plan status updated to ${status}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update plan status");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <CreditCardIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Billing & Subscription
          </h3>
        </div>
      </div>

      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Organization
        </label>
        {tenantsLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading organizations…</p>
        ) : (
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="w-full max-w-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      {info && (
        <div className="p-6 space-y-6">
          {error && <Alert variant="error" title="Error" message={error} />}
          {success && <Alert variant="success" title="Success" message={success} />}

          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Status</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
              {info.billing_exempt ? "Grandfathered" : info.plan_status.replace("_", " ")}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {info.stripe_customer_id ? `Stripe customer: ${info.stripe_customer_id}` : "No Stripe subscription on file."}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Manual Override</h4>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Button size="sm" variant={info.billing_exempt ? "outline" : "primary"} disabled={saving} onClick={handleToggleExempt}>
                {info.billing_exempt ? "Remove exemption" : "Grant exemption (comp this org)"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={saving}
                  onClick={() => handleChangeStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize border ${
                    status === info.plan_status
                      ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {status.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
