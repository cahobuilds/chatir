import type { Metadata } from "next";
import React from "react";
import VoiceAgentList from "@/components/VoiceAgentList";

export const metadata: Metadata = {
  title:
    "Voice Agent Management | AI Customer Care - TinAdmin",
  description: "Create, configure, and manage AI voice agents with advanced LLM settings and voice customization",
};

export default function VoiceAgentManagement() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Voice Agent Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Create, configure, and manage AI voice agents
        </p>
      </div>

      {/* Agent List - has its own "Create Agent" button wired to the template picker */}
      <VoiceAgentList />
    </div>
  );
}
