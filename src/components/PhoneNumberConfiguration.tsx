"use client";

import React, { useState } from "react";

export default function PhoneNumberConfiguration() {
  const [selectedNumber, setSelectedNumber] = useState("");
  const [assignedAgent, setAssignedAgent] = useState("");
  const [routingType, setRoutingType] = useState("auto-assign");
  const [businessHours, setBusinessHours] = useState(true);
  const [voicemailEnabled, setVoicemailEnabled] = useState(true);
  const [callerIdName, setCallerIdName] = useState("");
  const [emergencyRouting, setEmergencyRouting] = useState("");

  const availableAgents = [
    "Sales Agent",
    "Support Agent",
    "General Agent",
    "Emergency Agent",
    "Specialist Agent",
  ];

  const routingTypes = [
    { value: "auto-assign", label: "Auto-assign" },
    { value: "queue-based", label: "Queue-based" },
    { value: "round-robin", label: "Round-robin" },
    { value: "priority", label: "Priority" },
    { value: "manual", label: "Manual" },
  ];

  const handleSaveConfiguration = () => {
    // Handle configuration save logic
    console.log("Saving configuration:", {
      number: selectedNumber,
      agent: assignedAgent,
      routing: routingType,
      businessHours,
      voicemailEnabled,
      callerIdName,
      emergencyRouting,
    });
  };

  return (
    <div className="space-y-6">
      {/* Number Configuration */}
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
        <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
          Number Configuration
        </h2>

        <div className="space-y-4">
          {/* Select Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Phone Number
            </label>
            <select
              value={selectedNumber}
              onChange={(e) => setSelectedNumber(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Choose a number...</option>
              <option value="+1 (555) 123-4567">+1 (555) 123-4567</option>
              <option value="+1 (555) 987-6543">+1 (555) 987-6543</option>
              <option value="+1 (800) 555-0123">+1 (800) 555-0123</option>
              <option value="+1 (555) 321-0987">+1 (555) 321-0987</option>
            </select>
          </div>

          {/* Assigned Agent */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assigned Agent
            </label>
            <select
              value={assignedAgent}
              onChange={(e) => setAssignedAgent(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select agent...</option>
              {availableAgents.map((agent) => (
                <option key={agent} value={agent}>
                  {agent}
                </option>
              ))}
            </select>
          </div>

          {/* Routing Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Routing Type
            </label>
            <select
              value={routingType}
              onChange={(e) => setRoutingType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {routingTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Caller ID Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Caller ID Name
            </label>
            <input
              type="text"
              value={callerIdName}
              onChange={(e) => setCallerIdName(e.target.value)}
              placeholder="Your Company Name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Emergency Routing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Emergency Routing
            </label>
            <select
              value={emergencyRouting}
              onChange={(e) => setEmergencyRouting(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">No emergency routing</option>
              <option value="emergency-agent">Emergency Agent</option>
              <option value="external-service">External Service</option>
              <option value="voicemail">Voicemail Only</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSaveConfiguration}
          disabled={!selectedNumber}
          className="mt-6 w-full rounded-lg bg-indigo-600 py-2 text-white hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Save Configuration
        </button>
      </div>

      {/* Advanced Settings */}
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
        <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
          Advanced Settings
        </h3>

        <div className="space-y-4">
          {/* Business Hours */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Business Hours Only
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Route calls only during business hours
              </p>
            </div>
            <input
              type="checkbox"
              checked={businessHours}
              onChange={(e) => setBusinessHours(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
          </div>

          {/* Voicemail */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enable Voicemail
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Allow callers to leave voicemail messages
              </p>
            </div>
            <input
              type="checkbox"
              checked={voicemailEnabled}
              onChange={(e) => setVoicemailEnabled(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-900">
        <h3 className="mb-4 font-medium text-gray-900 dark:text-white">
          Number Statistics
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">1,247</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Calls Today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">98.5%</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Success Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}
