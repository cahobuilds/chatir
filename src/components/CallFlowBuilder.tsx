/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */"use client";

import React, { useState, useRef, useCallback } from "react";
import { 
  PlayIcon,
  PauseIcon,
  StopIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckIcon
} from "@heroicons/react/24/outline";

interface FlowNode {
  id: string;
  type: "start" | "greeting" | "menu" | "condition" | "action" | "transfer" | "end";
  title: string;
  x: number;
  y: number;
  connections: string[];
  properties: Record<string, any>;
}

interface FlowConnection {
  id: string;
  from: string;
  to: string;
  label?: string;
}

const initialNodes: FlowNode[] = [
  {
    id: "start",
    type: "start",
    title: "Start",
    x: 100,
    y: 50,
    connections: ["greeting"],
    properties: {}
  },
  {
    id: "greeting",
    type: "greeting",
    title: "Welcome Message",
    x: 100,
    y: 150,
    connections: ["menu"],
    properties: {
      message: "Hello! How can I help you today?",
      voice: "female",
      language: "en"
    }
  },
  {
    id: "menu",
    type: "menu",
    title: "Main Menu",
    x: 100,
    y: 250,
    connections: ["condition1", "condition2", "condition3"],
    properties: {
      options: [
        { key: "1", label: "Billing", action: "billing" },
        { key: "2", label: "Support", action: "support" },
        { key: "3", label: "Sales", action: "sales" }
      ]
    }
  },
  {
    id: "condition1",
    type: "condition",
    title: "Billing Flow",
    x: 50,
    y: 350,
    connections: ["action1"],
    properties: {
      condition: "billing",
      prompt: "Please say your account number"
    }
  },
  {
    id: "condition2",
    type: "condition",
    title: "Support Flow",
    x: 100,
    y: 350,
    connections: ["action2"],
    properties: {
      condition: "support",
      prompt: "What technical issue are you experiencing?"
    }
  },
  {
    id: "condition3",
    type: "condition",
    title: "Sales Flow",
    x: 150,
    y: 350,
    connections: ["transfer1"],
    properties: {
      condition: "sales",
      prompt: "I'll connect you with our sales team"
    }
  },
  {
    id: "action1",
    type: "action",
    title: "Process Billing",
    x: 50,
    y: 450,
    connections: ["end1"],
    properties: {
      action: "process_billing",
      api_endpoint: "/api/billing"
    }
  },
  {
    id: "action2",
    type: "action",
    title: "Create Support Ticket",
    x: 100,
    y: 450,
    connections: ["end2"],
    properties: {
      action: "create_ticket",
      api_endpoint: "/api/support"
    }
  },
  {
    id: "transfer1",
    type: "transfer",
    title: "Transfer to Sales",
    x: 150,
    y: 450,
    connections: ["end3"],
    properties: {
      department: "sales",
      extension: "1001"
    }
  },
  {
    id: "end1",
    type: "end",
    title: "End - Billing",
    x: 50,
    y: 550,
    connections: [],
    properties: {
      message: "Thank you for calling. Have a great day!"
    }
  },
  {
    id: "end2",
    type: "end",
    title: "End - Support",
    x: 100,
    y: 550,
    connections: [],
    properties: {
      message: "Your support ticket has been created. We'll contact you soon."
    }
  },
  {
    id: "end3",
    type: "end",
    title: "End - Transfer",
    x: 150,
    y: 550,
    connections: [],
    properties: {
      message: "Transferring you to sales now."
    }
  }
];

const initialConnections: FlowConnection[] = [
  { id: "c1", from: "start", to: "greeting" },
  { id: "c2", from: "greeting", to: "menu" },
  { id: "c3", from: "menu", to: "condition1", label: "1" },
  { id: "c4", from: "menu", to: "condition2", label: "2" },
  { id: "c5", from: "menu", to: "condition3", label: "3" },
  { id: "c6", from: "condition1", to: "action1" },
  { id: "c7", from: "condition2", to: "action2" },
  { id: "c8", from: "condition3", to: "transfer1" },
  { id: "c9", from: "action1", to: "end1" },
  { id: "c10", from: "action2", to: "end2" },
  { id: "c11", from: "transfer1", to: "end3" }
];

export default function CallFlowBuilder() {
  const [nodes, setNodes] = useState<FlowNode[]>(initialNodes);
  const [connections, setConnections] = useState<FlowConnection[]>(initialConnections);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const getNodeColor = (type: string) => {
    switch (type) {
      case "start":
        return "bg-green-500";
      case "greeting":
        return "bg-blue-500";
      case "menu":
        return "bg-purple-500";
      case "condition":
        return "bg-yellow-500";
      case "action":
        return "bg-indigo-500";
      case "transfer":
        return "bg-orange-500";
      case "end":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "start":
        return "▶️";
      case "greeting":
        return "👋";
      case "menu":
        return "📋";
      case "condition":
        return "❓";
      case "action":
        return "⚙️";
      case "transfer":
        return "📞";
      case "end":
        return "🏁";
      default:
        return "📦";
    }
  };

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(selectedNode === nodeId ? null : nodeId);
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setIsPaused(false);
    // Simulate flow execution
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setIsPaused(false);
  };

  const handleReset = () => {
    setNodes(initialNodes);
    setConnections(initialConnections);
    setSelectedNode(null);
  };

  const addNode = (type: FlowNode["type"]) => {
    const newNode: FlowNode = {
      id: `node_${Date.now()}`,
      type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
      x: 200 + Math.random() * 100,
      y: 200 + Math.random() * 100,
      connections: [],
      properties: {}
    };
    setNodes([...nodes, newNode]);
  };

  const deleteNode = (nodeId: string) => {
    setNodes(nodes.filter(node => node.id !== nodeId));
    setConnections(connections.filter(conn => conn.from !== nodeId && conn.to !== nodeId));
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Call Flow Builder
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Design and test your AI customer care call flows
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePlay}
              disabled={isPlaying}
              className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlayIcon className="w-4 h-4 mr-2" />
              Play
            </button>
            <button
              onClick={handlePause}
              disabled={!isPlaying}
              className="inline-flex items-center px-3 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PauseIcon className="w-4 h-4 mr-2" />
              {isPaused ? "Resume" : "Pause"}
            </button>
            <button
              onClick={handleStop}
              disabled={!isPlaying}
              className="inline-flex items-center px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <StopIcon className="w-4 h-4 mr-2" />
              Stop
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Flow Canvas */}
        <div 
          ref={canvasRef}
          className="relative w-full h-96 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 overflow-hidden"
        >
          {/* Connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {connections.map((connection) => {
              const fromNode = nodes.find(n => n.id === connection.from);
              const toNode = nodes.find(n => n.id === connection.to);
              if (!fromNode || !toNode) return null;

              return (
                <g key={connection.id}>
                  <path
                    d={`M ${fromNode.x + 50} ${fromNode.y + 25} L ${toNode.x + 50} ${toNode.y + 25}`}
                    stroke="#6B7280"
                    strokeWidth="2"
                    fill="none"
                    markerEnd="url(#arrowhead)"
                  />
                  {connection.label && (
                    <text
                      x={(fromNode.x + toNode.x) / 2 + 50}
                      y={(fromNode.y + toNode.y) / 2 + 20}
                      textAnchor="middle"
                      className="text-xs fill-gray-600 dark:fill-gray-400"
                    >
                      {connection.label}
                    </text>
                  )}
                </g>
              );
            })}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#6B7280"
                />
              </marker>
            </defs>
          </svg>

          {/* Nodes */}
          {nodes.map((node) => (
            <div
              key={node.id}
              className={`absolute w-24 h-12 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                selectedNode === node.id
                  ? "border-indigo-500 shadow-lg scale-105"
                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
              } ${getNodeColor(node.type)}`}
              style={{ left: node.x, top: node.y }}
              onClick={() => handleNodeClick(node.id)}
            >
              <div className="flex items-center justify-center h-full text-white text-xs font-medium">
                <span className="mr-1">{getNodeIcon(node.type)}</span>
                <span className="truncate">{node.title}</span>
              </div>
              
              {selectedNode === node.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNode(node.id);
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  <TrashIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Node Palette */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Add Nodes
          </h3>
          <div className="flex flex-wrap gap-2">
            {["greeting", "menu", "condition", "action", "transfer", "end"].map((type) => (
              <button
                key={type}
                onClick={() => addNode(type as FlowNode["type"])}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <span className="mr-2">{getNodeIcon(type)}</span>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Flow Status */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Flow Status
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {nodes.length} nodes, {connections.length} connections
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {isPlaying && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-600 dark:text-green-400">
                    {isPaused ? "Paused" : "Running"}
                  </span>
                </div>
              )}
              <button className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
                <CheckIcon className="w-4 h-4 mr-1" />
                Save Flow
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
