"use client";

import React, { useState } from "react";
import { 
  ExclamationTriangleIcon,
  PhoneIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  UserPlusIcon
} from "@heroicons/react/24/outline";

interface ActiveCall {
  id: string;
  customerName: string;
  phoneNumber: string;
  agent: string;
  duration: string;
  status: "active" | "on-hold" | "escalated";
  sentiment: "positive" | "neutral" | "negative";
  issue: string;
}

const mockActiveCalls: ActiveCall[] = [
  {
    id: "1",
    customerName: "John Smith",
    phoneNumber: "+1 (555) 123-4567",
    agent: "AI Agent Alpha",
    duration: "3:45",
    status: "active",
    sentiment: "neutral",
    issue: "Billing inquiry"
  },
  {
    id: "2",
    customerName: "Sarah Johnson",
    phoneNumber: "+1 (555) 987-6543",
    agent: "AI Agent Beta",
    duration: "1:23",
    status: "escalated",
    sentiment: "negative",
    issue: "Technical support"
  }
];

export default function CallInterventionPanel() {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>(mockActiveCalls);
  const [selectedCall, setSelectedCall] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "on-hold":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "escalated":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "text-green-600 dark:text-green-400";
      case "neutral":
        return "text-yellow-600 dark:text-yellow-400";
      case "negative":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const interveneInCall = (callId: string, action: string) => {
    console.log(`Intervening in call ${callId} with action: ${action}`);
    // Here you would implement the actual intervention logic
  };

  const escalateCall = (callId: string) => {
    setActiveCalls(activeCalls.map(call => 
      call.id === callId 
        ? { ...call, status: "escalated" as const }
        : call
    ));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Call Intervention
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Monitor and intervene in active calls
        </p>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {activeCalls.map((call) => (
            <div
              key={call.id}
              className={`p-4 border rounded-lg transition-all duration-200 ${
                selectedCall === call.id
                  ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {call.customerName}
                    </h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}>
                      {call.status}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <p>📞 {call.phoneNumber}</p>
                    <p>🤖 {call.agent}</p>
                    <p>⏱️ Duration: {call.duration}</p>
                    <p>📋 Issue: {call.issue}</p>
                    <p className={`font-medium ${getSentimentColor(call.sentiment)}`}>
                      Sentiment: {call.sentiment}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col space-y-2 ml-4">
                  <button
                    onClick={() => setSelectedCall(selectedCall === call.id ? null : call.id)}
                    className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                      selectedCall === call.id
                        ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {selectedCall === call.id ? "Hide" : "Intervene"}
                  </button>
                </div>
              </div>

              {selectedCall === call.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                      Intervention Actions
                    </h5>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => interveneInCall(call.id, "listen")}
                        className="flex items-center justify-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        <MicrophoneIcon className="w-4 h-4" />
                        <span className="text-xs font-medium">Listen</span>
                      </button>
                      
                      <button
                        onClick={() => interveneInCall(call.id, "whisper")}
                        className="flex items-center justify-center space-x-2 p-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                      >
                        <SpeakerWaveIcon className="w-4 h-4" />
                        <span className="text-xs font-medium">Whisper</span>
                      </button>
                      
                      <button
                        onClick={() => interveneInCall(call.id, "takeover")}
                        className="flex items-center justify-center space-x-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                      >
                        <UserPlusIcon className="w-4 h-4" />
                        <span className="text-xs font-medium">Takeover</span>
                      </button>
                      
                      <button
                        onClick={() => escalateCall(call.id)}
                        className="flex items-center justify-center space-x-2 p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <PhoneIcon className="w-4 h-4" />
                        <span className="text-xs font-medium">Escalate</span>
                      </button>
                    </div>

                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Quick Message to Agent
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Type a message to guide the agent..."
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
                      />
                      <button className="mt-2 w-full px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                        Send Message
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {activeCalls.length === 0 && (
          <div className="text-center py-8">
            <PhoneIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No active calls requiring intervention
            </p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {activeCalls.filter(call => call.status === "active").length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Active</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {activeCalls.filter(call => call.status === "on-hold").length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">On Hold</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {activeCalls.filter(call => call.status === "escalated").length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Escalated</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
