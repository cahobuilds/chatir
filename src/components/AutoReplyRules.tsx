"use client";

import React, { useState } from "react";
import { 
  Cog6ToothIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

interface AutoReplyRule {
  id: string;
  name: string;
  trigger: string;
  condition: string;
  response: string;
  priority: number;
  status: "active" | "inactive";
  matches: number;
  lastTriggered: string;
}

const mockRules: AutoReplyRule[] = [
  {
    id: "1",
    name: "Business Hours Greeting",
    trigger: "business_hours",
    condition: "time between 9:00 AM and 5:00 PM EST",
    response: "Welcome! Our support team is available during business hours.",
    priority: 1,
    status: "active",
    matches: 1247,
    lastTriggered: "2 minutes ago"
  },
  {
    id: "2",
    name: "After Hours Message",
    trigger: "after_hours",
    condition: "time outside 9:00 AM - 5:00 PM EST",
    response: "Thanks for reaching out! We'll respond during business hours.",
    priority: 2,
    status: "active",
    matches: 892,
    lastTriggered: "1 hour ago"
  },
  {
    id: "3",
    name: "High Priority Keywords",
    trigger: "urgent_keywords",
    condition: "message contains 'urgent', 'emergency', or 'critical'",
    response: "I understand this is urgent. Let me connect you with a priority agent.",
    priority: 1,
    status: "active",
    matches: 156,
    lastTriggered: "30 minutes ago"
  },
  {
    id: "4",
    name: "FAQ Redirect",
    trigger: "faq_keywords",
    condition: "message contains 'hours', 'location', or 'contact'",
    response: "Here's our FAQ page with common answers: [FAQ Link]",
    priority: 3,
    status: "inactive",
    matches: 234,
    lastTriggered: "2 hours ago"
  }
];

export default function AutoReplyRules() {
  const [rules, setRules] = useState<AutoReplyRule[]>(mockRules);
  const [showNewRule, setShowNewRule] = useState(false);

  const toggleRuleStatus = (ruleId: string) => {
    setRules(rules.map(rule => 
      rule.id === ruleId 
        ? { ...rule, status: rule.status === "active" ? "inactive" : "active" }
        : rule
    ));
  };

  const deleteRule = (ruleId: string) => {
    setRules(rules.filter(rule => rule.id !== ruleId));
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case 2:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case 3:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getStatusColor = (status: string) => {
    return status === "active" 
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cog6ToothIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Auto Reply Rules
            </h3>
          </div>
          <button 
            onClick={() => setShowNewRule(true)}
            className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            New Rule
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Rules List */}
        <div className="space-y-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {rule.name}
                    </h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(rule.priority)}`}>
                      Priority {rule.priority}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(rule.status)}`}>
                      {rule.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Trigger:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{rule.trigger}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Condition:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{rule.condition}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Response:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{rule.response}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>Matches: {rule.matches}</span>
                    <span>Last triggered: {rule.lastTriggered}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1 ml-4">
                  <button
                    onClick={() => toggleRuleStatus(rule.id)}
                    className={`p-1.5 ${
                      rule.status === "active" 
                        ? "text-green-600 hover:text-green-700" 
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                    title={rule.status === "active" ? "Deactivate rule" : "Activate rule"}
                  >
                    {rule.status === "active" ? (
                      <PauseIcon className="w-4 h-4" />
                    ) : (
                      <PlayIcon className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    title="Edit rule"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    title="Delete rule"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* New Rule Form */}
        {showNewRule && (
          <div className="mt-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
              Create New Auto Reply Rule
            </h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rule Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter rule name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white">
                    <option value="1">High (1)</option>
                    <option value="2">Medium (2)</option>
                    <option value="3">Low (3)</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Trigger Type
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white">
                  <option value="keywords">Keywords</option>
                  <option value="time">Time-based</option>
                  <option value="intent">Intent Detection</option>
                  <option value="sentiment">Sentiment Analysis</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Condition
                </label>
                <input
                  type="text"
                  placeholder="e.g., message contains 'urgent' or 'emergency'"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Auto Reply Message
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter the automatic response message"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="activate-rule"
                  className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="activate-rule" className="text-sm text-gray-700 dark:text-gray-300">
                  Activate rule immediately
                </label>
              </div>

              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                  Create Rule
                </button>
                <button 
                  onClick={() => setShowNewRule(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300">
                Auto Reply Tips
              </h4>
              <ul className="mt-2 text-sm text-blue-800 dark:text-blue-400 space-y-1">
                <li>• Rules are processed in priority order (1 = highest)</li>
                <li>• Use specific keywords to avoid false matches</li>
                <li>• Test rules with sample conversations before activating</li>
                <li>• Monitor rule performance and adjust as needed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
