"use client";

import React, { useState, useEffect } from "react";
import { 
  CreditCardIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import Alert from "./ui/alert/Alert";

export default function TenantBilling() {
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [selectedTenantPlanTier, setSelectedTenantPlanTier] = useState<"starter" | "pro" | "enterprise">("starter");
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [updatingTier, setUpdatingTier] = useState(false);
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
          const tier = data.tenant?.plan_tier;
          setSelectedTenantPlanTier(tier === "pro" || tier === "enterprise" ? tier : "starter");
        }
      } catch (err) {
        console.error("[TenantBilling] Failed to fetch selected tenant:", err);
      }
    };
    fetchSelectedTenant();
  }, [selectedTenantId]);

  const handleChangeTier = async (tier: "starter" | "pro" | "enterprise") => {
    if (!selectedTenantId) return;
    setUpdatingTier(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/tenants/${selectedTenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_tier: tier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update plan tier");
      setSelectedTenantPlanTier(tier);
      setSuccess(`Plan tier updated to ${tier}.`);
    } catch (err: any) {
      setError(err.message || "Failed to update plan tier");
    } finally {
      setUpdatingTier(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [billingData, setBillingData] = useState({
    currentPlan: {
      name: "Enterprise",
      price: 299,
      period: "month",
      features: ["Unlimited Agents", "Unlimited Calls", "Advanced Analytics", "Priority Support"],
      nextBilling: "2024-02-15"
    },
    usage: {
      agents: 25,
      maxAgents: 50,
      calls: 1250,
      maxCalls: 2000,
      storage: "45GB",
      maxStorage: "100GB"
    },
    invoices: [
      {
        id: "INV-2024-001",
        date: "2024-01-15",
        amount: 299.00,
        status: "paid",
        description: "Monthly Enterprise Plan"
      },
      {
        id: "INV-2023-012",
        date: "2023-12-15",
        amount: 299.00,
        status: "paid",
        description: "Monthly Enterprise Plan"
      },
      {
        id: "INV-2023-011",
        date: "2023-11-15",
        amount: 299.00,
        status: "paid",
        description: "Monthly Enterprise Plan"
      }
    ],
    paymentMethod: {
      type: "card",
      last4: "4242",
      brand: "Visa",
      expiryMonth: "12",
      expiryYear: "2025"
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "failed": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <CreditCardIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Billing & Usage
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

      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Plan Tier</h4>
        <div className="flex gap-2">
          {(["starter", "pro", "enterprise"] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              disabled={updatingTier}
              onClick={() => handleChangeTier(tier)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize border ${
                tier === selectedTenantPlanTier
                  ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
        {error && <div className="mt-4"><Alert variant="error" title="Error" message={error} /></div>}
        {success && <div className="mt-4"><Alert variant="success" title="Success" message={success} /></div>}
      </div>

      <div className="p-6 space-y-6">
        {/* Current Plan */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Current Plan
          </h4>
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {billingData.currentPlan.name}
                </h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Next billing: {new Date(billingData.currentPlan.nextBilling).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  ${billingData.currentPlan.price}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  per {billingData.currentPlan.period}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              {billingData.currentPlan.features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                </div>
              ))}
            </div>
            
            <button className="w-full inline-flex items-center justify-center px-4 py-2 border border-indigo-300 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-indigo-600 dark:text-indigo-300 dark:hover:bg-indigo-900/20">
              Change Plan
            </button>
          </div>
        </div>

        {/* Usage Statistics */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Current Usage
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Agents
                </span>
                <span className="text-sm text-blue-600 dark:text-blue-400">
                  {billingData.usage.agents}/{billingData.usage.maxAgents}
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${(billingData.usage.agents / billingData.usage.maxAgents) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  Calls
                </span>
                <span className="text-sm text-green-600 dark:text-green-400">
                  {billingData.usage.calls.toLocaleString()}/{billingData.usage.maxCalls.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${(billingData.usage.calls / billingData.usage.maxCalls) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                  Storage
                </span>
                <span className="text-sm text-purple-600 dark:text-purple-400">
                  {billingData.usage.storage}/{billingData.usage.maxStorage}
                </span>
              </div>
              <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ width: `${(parseInt(billingData.usage.storage) / parseInt(billingData.usage.maxStorage)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Payment Method
          </h4>
          <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <CreditCardIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {billingData.paymentMethod.brand} •••• {billingData.paymentMethod.last4}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Expires {billingData.paymentMethod.expiryMonth}/{billingData.paymentMethod.expiryYear}
                  </p>
                </div>
              </div>
              <button className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                Update
              </button>
            </div>
          </div>
        </div>

        {/* Recent Invoices */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Recent Invoices
            </h4>
            <button className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
              View All
            </button>
          </div>
          
          <div className="space-y-3">
            {billingData.invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <DocumentTextIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {invoice.id}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(invoice.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      ${invoice.amount.toFixed(2)}
                    </p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </div>
                  <button className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Billing Alerts */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Usage Alert
              </h5>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                You&apos;re using 75% of your call limit for this month. Consider upgrading your plan to avoid service interruptions.
              </p>
              <button className="mt-2 text-sm text-yellow-800 dark:text-yellow-200 hover:text-yellow-900 dark:hover:text-yellow-100 font-medium">
                Upgrade Plan →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
