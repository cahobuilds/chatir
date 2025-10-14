import type { Metadata } from "next";
import React from "react";
import VoiceAgentList from "@/components/VoiceAgentList";
import AgentConfiguration from "@/components/AgentConfiguration";
import LLMConfiguration from "@/components/LLMConfiguration";

export const metadata: Metadata = {
  title:
    "Voice Agent Management | AI Customer Care - TinAdmin",
  description: "Create, configure, and manage AI voice agents with advanced LLM settings and voice customization",
};

export default function VoiceAgentManagement() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Voice Agent Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create, configure, and manage AI voice agents
          </p>
        </div>
        <button className="rounded-lg bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700">
          Create New Agent
        </button>
      </div>

      {/* Agent List */}
      <VoiceAgentList />

      {/* Configuration Sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AgentConfiguration />
        <LLMConfiguration />
      </div>
    </div>
  );
}
