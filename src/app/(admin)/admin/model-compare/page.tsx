import type { Metadata } from "next";
import React from "react";
import ModelCompare from "@/components/admin/ModelCompare";

export const metadata: Metadata = {
  title: "Model Comparison | Multi-Tenant AI SaaS Platform",
  description: "Compare candidate voice-provider models on an IR question",
};

export default function ModelComparePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Model Comparison</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Test candidate models to decide which to expose in the curated allowlist.
          </p>
        </div>
      </div>
      <ModelCompare />
    </div>
  );
}
