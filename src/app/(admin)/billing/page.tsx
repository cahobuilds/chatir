import type { Metadata } from "next";
import React from "react";
import TenantBilling from "@/components/TenantBilling";

export const metadata: Metadata = {
  title: "Billing & Usage | Chat IR",
  description: "Manage billing, subscription plans, and usage for your organization",
};

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
            <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Billing & Usage
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage your subscription, payment methods, and usage
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12">
          <TenantBilling />
        </div>
      </div>
    </div>
  );
}

