/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */"use client";

import React, { useState } from "react";
import { 
  CogIcon,
  LanguageIcon,
  CpuChipIcon,
  ChatBubbleLeftRightIcon
} from "@heroicons/react/24/outline";

export default function ChatAgentConfiguration() {
  const [config, setConfig] = useState({
    name: "Customer Support Bot",
    description: "Handles general customer inquiries and support requests",
    language: "en",
    model: "gpt-4",
    maxTokens: 2048,
    temperature: 0.7,
    responseStyle: "professional",
    enableTypingIndicator: true,
    enableEmojiReactions: true,
    autoEscalation: true,
    escalationThreshold: 3,
    workingHours: "24/7",
    timezone: "UTC"
  });

  const handleConfigChange = (field: string, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <CogIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Agent Configuration
          </h3>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Basic Settings */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Basic Settings
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Agent Name
              </label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => handleConfigChange("name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={config.description}
                onChange={(e) => handleConfigChange("description", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Language & Model */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Language & Model
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <select
                value={config.language}
                onChange={(e) => handleConfigChange("language", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Model
              </label>
              <select
                value={config.model}
                onChange={(e) => handleConfigChange("model", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3">Claude 3</option>
                <option value="claude-2">Claude 2</option>
              </select>
            </div>
          </div>
        </div>

        {/* Response Settings */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Response Settings
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Tokens: {config.maxTokens}
              </label>
              <input
                type="range"
                min="512"
                max="4096"
                step="256"
                value={config.maxTokens}
                onChange={(e) => handleConfigChange("maxTokens", parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Temperature: {config.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.temperature}
                onChange={(e) => handleConfigChange("temperature", parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Response Style
              </label>
              <select
                value={config.responseStyle}
                onChange={(e) => handleConfigChange("responseStyle", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
              </select>
            </div>
          </div>
        </div>

        {/* Features */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Features
          </h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.enableTypingIndicator}
                onChange={(e) => handleConfigChange("enableTypingIndicator", e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Enable Typing Indicator
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.enableEmojiReactions}
                onChange={(e) => handleConfigChange("enableEmojiReactions", e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Enable Emoji Reactions
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.autoEscalation}
                onChange={(e) => handleConfigChange("autoEscalation", e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Auto Escalation
              </span>
            </label>
          </div>
        </div>

        {/* Escalation Settings */}
        {config.autoEscalation && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
              Escalation Settings
            </h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Escalation Threshold: {config.escalationThreshold} failed attempts
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={config.escalationThreshold}
                onChange={(e) => handleConfigChange("escalationThreshold", parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Working Hours */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Working Hours
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Schedule
              </label>
              <select
                value={config.workingHours}
                onChange={(e) => handleConfigChange("workingHours", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="24/7">24/7</option>
                <option value="business-hours">Business Hours</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timezone
              </label>
              <select
                value={config.timezone}
                onChange={(e) => handleConfigChange("timezone", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="UTC">UTC</option>
                <option value="EST">Eastern Time</option>
                <option value="PST">Pacific Time</option>
                <option value="GMT">Greenwich Mean Time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors">
            Save Configuration
          </button>
          <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors">
            Test Agent
          </button>
        </div>
      </div>
    </div>
  );
}
