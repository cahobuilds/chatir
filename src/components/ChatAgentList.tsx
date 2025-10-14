"use client";

import React, { useState } from "react";
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  PlayIcon, 
  PauseIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon
} from "@heroicons/react/24/outline";

interface ChatAgent {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive" | "training";
  language: string;
  responseTime: string;
  conversations: number;
  satisfaction: number;
  lastActive: string;
  model: string;
}

const mockChatAgents: ChatAgent[] = [
  {
    id: "1",
    name: "Customer Support Bot",
    description: "Handles general customer inquiries and support requests",
    status: "active",
    language: "English",
    responseTime: "2.3s",
    conversations: 1247,
    satisfaction: 4.2,
    lastActive: "2 minutes ago",
    model: "GPT-4"
  },
  {
    id: "2",
    name: "Sales Assistant",
    description: "Helps with product information and sales inquiries",
    status: "active",
    language: "English",
    responseTime: "1.8s",
    conversations: 892,
    satisfaction: 4.5,
    lastActive: "5 minutes ago",
    model: "GPT-4"
  },
  {
    id: "3",
    name: "Technical Support",
    description: "Provides technical assistance and troubleshooting",
    status: "training",
    language: "English",
    responseTime: "3.1s",
    conversations: 156,
    satisfaction: 3.8,
    lastActive: "1 hour ago",
    model: "GPT-3.5"
  },
  {
    id: "4",
    name: "Spanish Support",
    description: "Customer support in Spanish language",
    status: "inactive",
    language: "Spanish",
    responseTime: "2.7s",
    conversations: 234,
    satisfaction: 4.1,
    lastActive: "2 hours ago",
    model: "GPT-4"
  }
];

export default function ChatAgentList() {
  const [agents, setAgents] = useState<ChatAgent[]>(mockChatAgents);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      case "training":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const toggleAgentStatus = (agentId: string) => {
    setAgents(agents.map(agent => 
      agent.id === agentId 
        ? { 
            ...agent, 
            status: agent.status === "active" ? "inactive" : "active" 
          }
        : agent
    ));
  };

  const deleteAgent = (agentId: string) => {
    setAgents(agents.filter(agent => agent.id !== agentId));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Chat Agents
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage your AI chat agents and their configurations
            </p>
          </div>
          <button className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Agent
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className={`p-4 border rounded-lg transition-all duration-200 ${
                selectedAgent === agent.id
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                      <ChatBubbleLeftRightIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {agent.name}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                        {agent.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {agent.description}
                    </p>
                    <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                      <span>Language: {agent.language}</span>
                      <span>Model: {agent.model}</span>
                      <span>Response Time: {agent.responseTime}</span>
                      <span>Conversations: {agent.conversations.toLocaleString()}</span>
                      <span>Satisfaction: {agent.satisfaction}/5</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Last active: {agent.lastActive}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="View Details"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleAgentStatus(agent.id)}
                    className={`p-2 ${
                      agent.status === "active" 
                        ? "text-green-600 hover:text-green-700" 
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                    title={agent.status === "active" ? "Pause Agent" : "Activate Agent"}
                  >
                    {agent.status === "active" ? (
                      <PauseIcon className="w-4 h-4" />
                    ) : (
                      <PlayIcon className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    title="Edit Agent"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteAgent(agent.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    title="Delete Agent"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {selectedAgent === agent.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Performance Metrics
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Avg Response Time</span>
                          <span className="font-medium">{agent.responseTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Success Rate</span>
                          <span className="font-medium">94.2%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Escalation Rate</span>
                          <span className="font-medium">5.8%</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Configuration
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Language</span>
                          <span className="font-medium">{agent.language}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Model</span>
                          <span className="font-medium">{agent.model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Max Tokens</span>
                          <span className="font-medium">2048</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Recent Activity
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Today&apos;s Conversations</span>
                          <span className="font-medium">47</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Resolved Issues</span>
                          <span className="font-medium">42</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Escalated</span>
                          <span className="font-medium">5</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
