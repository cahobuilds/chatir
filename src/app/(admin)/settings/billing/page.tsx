import type { Metadata } from "next";
import React from "react";
import CompanyBilling from "@/components/CompanyBilling";

export const metadata: Metadata = {
  title: "Billing | Chat IR",
  description: "Manage your organization's plan and billing.",
};

export default function CompanyBillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your plan, payment method, and invoices</p>
      </div>
      <CompanyBilling />
    </div>
  );
}
