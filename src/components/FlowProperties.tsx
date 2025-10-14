/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */"use client";

import React, { useState } from "react";
import { 
  CogIcon,
  DocumentTextIcon,
  SpeakerWaveIcon,
  LanguageIcon,
  ClockIcon,
  CheckIcon
} from "@heroicons/react/24/outline";

interface NodeProperties {
  id: string;
  type: string;
  title: string;
  properties: Record<string, any>;
}

const mockSelectedNode: NodeProperties = {
  id: "greeting",
  type: "greeting",
  title: "Welcome Message",
  properties: {
    message: "Hello! How can I help you today?",
    voice: "female",
    language: "en",
    speed: 1.0,
    volume: 0.8,
    timeout: 30,
    retries: 3,
    bargeIn: true,
    silenceTimeout: 5
  }
};

export default function FlowProperties() {
  const [selectedNode, setSelectedNode] = useState<NodeProperties | null>(mockSelectedNode);
  const [properties, setProperties] = useState(selectedNode?.properties || {});

  const handlePropertyChange = (key: string, value: any) => {
    setProperties(prev => ({ ...prev, [key]: value }));
  };

  const saveProperties = () => {
    console.log("Saving properties:", properties);
    // Here you would implement the logic to save the properties
  };

  const getPropertyIcon = (key: string) => {
    switch (key) {
      case "message":
        return <DocumentTextIcon className="w-4 h-4" />;
      case "voice":
      case "speed":
      case "volume":
        return <SpeakerWaveIcon className="w-4 h-4" />;
      case "language":
        return <LanguageIcon className="w-4 h-4" />;
      case "timeout":
      case "retries":
      case "silenceTimeout":
        return <ClockIcon className="w-4 h-4" />;
      default:
        return <CogIcon className="w-4 h-4" />;
    }
  };

  if (!selectedNode) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="text-center py-8">
            <CogIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              Select a node to edit its properties
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <CogIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Node Properties
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {selectedNode.title}
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Basic Properties */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Basic Settings
          </h4>
          <div className="space-y-4">
            {Object.entries(properties).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <div className="flex items-center space-x-2">
                    {getPropertyIcon(key)}
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </div>
                </label>
                
                {key === "message" ? (
                  <textarea
                    value={value}
                    onChange={(e) => handlePropertyChange(key, e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                ) : key === "voice" ? (
                  <select
                    value={value}
                    onChange={(e) => handlePropertyChange(key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="female">Female Voice</option>
                    <option value="male">Male Voice</option>
                    <option value="neural-female">Neural Female</option>
                    <option value="neural-male">Neural Male</option>
                  </select>
                ) : key === "language" ? (
                  <select
                    value={value}
                    onChange={(e) => handlePropertyChange(key, e.target.value)}
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
                ) : key === "speed" || key === "volume" ? (
                  <div>
                    <input
                      type="range"
                      min="0.1"
                      max="2.0"
                      step="0.1"
                      value={value}
                      onChange={(e) => handlePropertyChange(key, parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>0.1</span>
                      <span className="font-medium">{value}</span>
                      <span>2.0</span>
                    </div>
                  </div>
                ) : key === "timeout" || key === "retries" || key === "silenceTimeout" ? (
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={value}
                    onChange={(e) => handlePropertyChange(key, parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                ) : typeof value === "boolean" ? (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => handlePropertyChange(key, e.target.checked)}
                      className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Enable {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </label>
                ) : (
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handlePropertyChange(key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Advanced Properties */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Advanced Settings
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Node ID
              </label>
              <input
                type="text"
                value={selectedNode.id}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Node Type
              </label>
              <input
                type="text"
                value={selectedNode.type}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={saveProperties}
            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
          >
            <CheckIcon className="w-4 h-4 inline mr-2" />
            Save
          </button>
          <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors">
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
