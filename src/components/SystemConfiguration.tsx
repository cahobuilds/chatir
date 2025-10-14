"use client";

import React, { useState } from "react";
import { 
  CpuChipIcon,
  ServerIcon,
  CircleStackIcon,
  CloudIcon
} from "@heroicons/react/24/outline";

export default function SystemConfiguration() {
  const [config, setConfig] = useState({
    maxConcurrentCalls: 100,
    maxAgents: 50,
    callTimeout: 300,
    recordingRetention: 90,
    dataRetention: 365,
    autoScaling: true,
    loadBalancing: true,
    failoverEnabled: true,
    monitoringEnabled: true
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <ServerIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            System Configuration
          </h3>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Performance Settings */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <CpuChipIcon className="w-4 h-4 mr-2" />
            Performance Settings
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Concurrent Calls
              </label>
              <input
                type="number"
                value={config.maxConcurrentCalls}
                onChange={(e) => setConfig({...config, maxConcurrentCalls: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Active Agents
              </label>
              <input
                type="number"
                value={config.maxAgents}
                onChange={(e) => setConfig({...config, maxAgents: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Call Timeout (seconds)
              </label>
              <input
                type="number"
                value={config.callTimeout}
                onChange={(e) => setConfig({...config, callTimeout: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <CircleStackIcon className="w-4 h-4 mr-2" />
            Data Management
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recording Retention (days)
              </label>
              <input
                type="number"
                value={config.recordingRetention}
                onChange={(e) => setConfig({...config, recordingRetention: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data Retention (days)
              </label>
              <input
                type="number"
                value={config.dataRetention}
                onChange={(e) => setConfig({...config, dataRetention: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* System Features */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <CloudIcon className="w-4 h-4 mr-2" />
            System Features
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Auto Scaling
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Automatically scale resources based on demand
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoScaling}
                  onChange={(e) => setConfig({...config, autoScaling: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Load Balancing
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Distribute load across multiple servers
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.loadBalancing}
                  onChange={(e) => setConfig({...config, loadBalancing: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Failover Protection
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Automatic failover to backup systems
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.failoverEnabled}
                  onChange={(e) => setConfig({...config, failoverEnabled: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  System Monitoring
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Real-time system health monitoring
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.monitoringEnabled}
                  onChange={(e) => setConfig({...config, monitoringEnabled: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
