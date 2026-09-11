"use client";

import React, { useEffect, useState } from "react";
import { CreditCardIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { useOrganization } from "@/context/OrganizationContext";
import { usePermissions } from "@/hooks/usePermissions";
import Button from "./ui/button/Button";
import Alert from "./ui/alert/Alert";

interface PlanTierOption {
  id: "starter" | "pro" | "enterprise";
  name: string;
  price: string;
  features: string[];
}

const PLAN_TIERS: PlanTierOption[] = [
  { id: "starter", name: "Starter", price: "$99/mo", features: ["1 voice agent", "1 chat agent", "5,000 msgs/mo"] },
  { id: "pro", name: "Pro", price: "$299/mo", features: ["5 voice agents", "5 chat agents", "50,000 msgs/mo", "Priority support"] },
  { id: "enterprise", name: "Enterprise", price: "Contact us", features: ["Unlimited agents", "Unlimited usage", "Dedicated support"] },
];

// Illustrative-only mock data - never sent anywhere, no real payment processor is
// wired up yet. See docs/superpowers/specs/2026-09-11-platform-polish-and-rebrand-design.md
// section 8 for the Phase 5 real-Stripe follow-up.
const MOCK_INVOICES = [
  { id: "INV-0003", date: "2026-08-01", amount: 299, status: "paid" },
  { id: "INV-0002", date: "2026-07-01", amount: 299, status: "paid" },
  { id: "INV-0001", date: "2026-06-01", amount: 99, status: "paid" },
];

export default function CompanyBilling() {
  const { currentOrganization } = useOrganization();
  const { hasPermission } = usePermissions(currentOrganization?.id || null);
  const canManageBilling = hasPermission("billing.manage");

  const [currentTier, setCurrentTier] = useState<PlanTierOption["id"]>("starter");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [cardSaved, setCardSaved] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenant = async () => {
      if (!currentOrganization?.id) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/tenants/${currentOrganization.id}`);
        if (res.ok) {
          const data = await res.json();
          const tier = data.tenant?.plan_tier;
          if (tier === "starter" || tier === "pro" || tier === "enterprise") {
            setCurrentTier(tier);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetchTenant();
  }, [currentOrganization?.id]);

  const handleSelectTier = async (tierId: PlanTierOption["id"]) => {
    if (!currentOrganization?.id || tierId === currentTier) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/tenants/${currentOrganization.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_tier: tierId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update plan");
      setCurrentTier(tierId);
      setSuccess(`Plan updated to ${tierId}.`);
    } catch (err: any) {
      setError(err.message || "Failed to update plan");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock only - never sent anywhere. Real Stripe Elements integration is Phase 5.
    const last4 = cardNumber.replace(/\D/g, "").slice(-4) || "4242";
    setCardSaved(last4);
    setCardNumber("");
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

  return (
    <div className="space-y-6">
      {error && <Alert variant="error" title="Error" message={error} />}
      {success && <Alert variant="success" title="Success" message={success} />}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLAN_TIERS.map((tier) => (
            <button
              key={tier.id}
              type="button"
              disabled={saving}
              onClick={() => handleSelectTier(tier.id)}
              className={`text-left rounded-xl border p-4 transition-colors ${
                tier.id === currentTier
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                  : "border-gray-200 dark:border-gray-700 hover:border-brand-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900 dark:text-white">{tier.name}</span>
                {tier.id === currentTier && (
                  <span className="text-xs font-medium text-brand-600 dark:text-brand-400">Current</span>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{tier.price}</p>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {tier.features.map((f) => <li key={f}>• {f}</li>)}
              </ul>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <CreditCardIcon className="w-5 h-5" /> Payment Method
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Illustrative only for now — no real card is stored or charged.
        </p>
        {cardSaved ? (
          <p className="text-sm text-gray-700 dark:text-gray-300">Visa •••• {cardSaved} saved.</p>
        ) : (
          <form onSubmit={handleSaveCard} className="flex flex-wrap gap-2 items-end">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Card number"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
              maxLength={19}
              required
            />
            <Button size="sm" type="submit">Save</Button>
          </form>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <DocumentTextIcon className="w-5 h-5" /> Invoices
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Illustrative example invoices.</p>
        <div className="space-y-2">
          {MOCK_INVOICES.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0 text-sm">
              <span className="text-gray-900 dark:text-white">{inv.id}</span>
              <span className="text-gray-500 dark:text-gray-400">{inv.date}</span>
              <span className="text-gray-900 dark:text-white">${inv.amount}.00</span>
              <span className="text-green-600 dark:text-green-400 capitalize">{inv.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
