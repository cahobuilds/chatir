import type { Metadata } from "next";
import React from "react";
import APIHeader from "@/components/APIHeader";
import APIEndpoints from "@/components/APIEndpoints";
import APIRequestBuilder from "@/components/APIRequestBuilder";
import APIResponseViewer from "@/components/APIResponseViewer";
import APIDocumentation from "@/components/APIDocumentation";

export const metadata: Metadata = {
  title:
    "API Playground | TinAdmin - AI Customer Care Dashboard",
  description: "Test and explore AI Customer Care Bot API endpoints with interactive playground and documentation.",
};

export default function APIPlaygroundPage() {
  return (
    <div className="space-y-6">
      <APIHeader />

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 lg:col-span-4">
          <APIEndpoints />
        </div>
        <div className="col-span-12 lg:col-span-8">
          <div className="space-y-6">
            <APIRequestBuilder />
            <APIResponseViewer />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12">
          <APIDocumentation />
        </div>
      </div>
    </div>
  );
}
