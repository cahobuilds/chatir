import type { Metadata } from "next";
import React from "react";
import CustomerExperienceMetrics from "@/components/CustomerExperienceMetrics";

export const metadata: Metadata = {
  title: "Customer Experience | Chat IR",
  description: "Customer satisfaction trends, sentiment analysis, and experience metrics",
};

export default function CustomerExperiencePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Customer Experience
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Customer satisfaction trends, sentiment analysis, resolution rates, and journey analytics
          </p>
        </div>
      </div>

      {/* Customer Experience Metrics */}
      <CustomerExperienceMetrics />
    </div>
  );
}

