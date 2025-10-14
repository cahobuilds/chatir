import type { Metadata } from "next";
import React from "react";
import ChatAgentList from "@/components/ChatAgentList";
import ChatAgentConfiguration from "@/components/ChatAgentConfiguration";
import ResponseTemplates from "@/components/ResponseTemplates";
import AutoReplyRules from "@/components/AutoReplyRules";

export const metadata: Metadata = {
  title:
    "Chat Agent Management | TinAdmin - AI Customer Care Dashboard",
  description: "Create, configure, and manage AI chat agents with advanced settings and response templates.",
};

export default function ChatAgentsPage() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 lg:col-span-8">
        <ChatAgentList />
      </div>
      <div className="col-span-12 lg:col-span-4 space-y-6">
        <ChatAgentConfiguration />
        <ResponseTemplates />
        <AutoReplyRules />
      </div>
    </div>
  );
}
