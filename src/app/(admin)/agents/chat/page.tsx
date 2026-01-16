import type { Metadata } from "next";
import React from "react";
import ChatAgentList from "@/components/ChatAgentList";

export const metadata: Metadata = {
  title:
    "Chat Agent Management | TinAdmin - AI Customer Care Dashboard",
  description: "Create, configure, and manage AI chat agents.",
};

export default function ChatAgentsPage() {
  return (
    <div className="w-full">
      <ChatAgentList />
    </div>
  );
}
