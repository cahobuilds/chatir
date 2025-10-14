"use client";

import React, { useState } from "react";

export default function PhoneNumbersList() {
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);

  const phoneNumbers = [
    {
      id: "num-1",
      number: "+1 (555) 123-4567",
      type: "toll-free",
      status: "active",
      assignedAgent: "Sales Agent",
      region: "US - East Coast",
      monthlyCost: "$2.50",
      callsToday: 1247,
      lastActivity: "2 minutes ago",
      capabilities: ["voice", "sms"],
      routing: "Auto-assign",
    },
    {
      id: "num-2",
      number: "+1 (555) 987-6543",
      type: "local",
      status: "active",
      assignedAgent: "Support Agent",
      region: "US - West Coast",
      monthlyCost: "$1.00",
      callsToday: 892,
      lastActivity: "5 minutes ago",
      capabilities: ["voice"],
      routing: "Queue-based",
    },
    {
      id: "num-3",
      number: "+1 (800) 555-0123",
      type: "toll-free",
      status: "active",
      assignedAgent: "General Agent",
      region: "US - National",
      monthlyCost: "$2.50",
      callsToday: 567,
      lastActivity: "1 minute ago",
      capabilities: ["voice", "sms"],
      routing: "Round-robin",
    },
    {
      id: "num-4",
      number: "+1 (555) 456-7890",
      type: "local",
      status: "maintenance",
      assignedAgent: null,
      region: "US - Central",
      monthlyCost: "$1.00",
      callsToday: 0,
      lastActivity: "2 hours ago",
      capabilities: ["voice"],
      routing: "Manual",
    },
    {
      id: "num-5",
      number: "+1 (555) 321-0987",
      type: "mobile",
      status: "active",
      assignedAgent: "Emergency Agent",
      region: "US - South",
      monthlyCost: "$3.00",
      callsToday: 89,
      lastActivity: "30 seconds ago",
      capabilities: ["voice", "sms", "mms"],
      routing: "Priority",
    },
    {
      id: "num-6",
      number: "+1 (555) 654-3210",
      type: "local",
      status: "available",
      assignedAgent: null,
      region: "US - Northeast",
      monthlyCost: "$1.00",
      callsToday: 0,
      lastActivity: "Never",
      capabilities: ["voice"],
      routing: "Not configured",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "available":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "toll-free":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "local":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "mobile":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Phone Numbers Inventory
        </h2>
        <div className="flex items-center space-x-2">
          <select className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
            <option>All Types</option>
            <option>Toll-Free</option>
            <option>Local</option>
            <option>Mobile</option>
          </select>
          <select className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
            <option>All Status</option>
            <option>Active</option>
            <option>Maintenance</option>
            <option>Available</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {phoneNumbers.map((number) => (
          <div
            key={number.id}
            className={`rounded-lg border p-4 cursor-pointer transition-colors ${
              selectedNumber === number.id
                ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-900"
                : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
            }`}
            onClick={() => setSelectedNumber(selectedNumber === number.id ? null : number.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center dark:bg-indigo-900">
                  <span className="text-indigo-600 text-lg font-semibold dark:text-indigo-300">
                    📞
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {number.number}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {number.region}
                  </p>
                  <div className="mt-1 flex items-center space-x-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${getTypeColor(number.type)}`}>
                      {number.type}
                    </span>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(number.status)}`}>
                      {number.status}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {number.assignedAgent || "Unassigned"}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {number.callsToday.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    calls today
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {number.monthlyCost}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    per month
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {number.routing}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    last: {number.lastActivity}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="rounded-lg bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                    Configure
                  </button>
                  <button className="rounded-lg bg-blue-100 px-3 py-1 text-sm text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800">
                    Edit
                  </button>
                  {number.status === "available" && (
                    <button className="rounded-lg bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800">
                      Release
                    </button>
                  )}
                </div>
              </div>
            </div>

            {selectedNumber === number.id && (
              <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Capabilities
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {number.capabilities.map((capability) => (
                        <span
                          key={capability}
                          className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        >
                          {capability.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Routing Configuration
                    </h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {number.routing}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Quick Actions
                    </h4>
                    <div className="flex space-x-2">
                      <button className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800">
                        Test Call
                      </button>
                      <button className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800">
                        View Logs
                      </button>
                      <button className="rounded bg-purple-100 px-2 py-1 text-xs text-purple-700 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:hover:bg-purple-800">
                        Analytics
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
