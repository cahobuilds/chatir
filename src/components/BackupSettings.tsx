"use client";

import React, { useState } from "react";
import { 
  CloudArrowUpIcon,
  ClockIcon,
  ShieldCheckIcon,
  DocumentArrowDownIcon
} from "@heroicons/react/24/outline";

export default function BackupSettings() {
  const [backupSettings, setBackupSettings] = useState({
    autoBackup: true,
    frequency: "daily",
    retention: 30,
    encryption: true,
    compression: true,
    cloudStorage: true,
    localStorage: true,
    lastBackup: "2024-01-15 14:30:00",
    nextBackup: "2024-01-16 02:00:00"
  });

  const backupHistory = [
    {
      id: 1,
      date: "2024-01-15 14:30:00",
      type: "Full Backup",
      size: "2.4 GB",
      status: "Completed",
      duration: "12m 34s"
    },
    {
      id: 2,
      date: "2024-01-14 14:30:00",
      type: "Incremental",
      size: "156 MB",
      status: "Completed",
      duration: "3m 12s"
    },
    {
      id: 3,
      date: "2024-01-13 14:30:00",
      type: "Incremental",
      size: "89 MB",
      status: "Completed",
      duration: "2m 45s"
    },
    {
      id: 4,
      date: "2024-01-12 14:30:00",
      type: "Full Backup",
      size: "2.1 GB",
      status: "Failed",
      duration: "0s"
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <CloudArrowUpIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Backup Settings
          </h3>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Auto Backup Settings */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Automatic Backup
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Enable automatic system backups
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={backupSettings.autoBackup}
                onChange={(e) => setBackupSettings({...backupSettings, autoBackup: e.target.checked})}
                className="sr-only peer"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
            </label>
          </div>

          {backupSettings.autoBackup && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <ClockIcon className="w-4 h-4 inline mr-1" />
                  Backup Frequency
                </label>
                <select
                  value={backupSettings.frequency}
                  onChange={(e) => setBackupSettings({...backupSettings, frequency: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Retention Period (days)
                </label>
                <input
                  type="number"
                  value={backupSettings.retention}
                  onChange={(e) => setBackupSettings({...backupSettings, retention: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Backup Options */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Backup Options
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  <ShieldCheckIcon className="w-4 h-4 inline mr-1" />
                  Encryption
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Encrypt backup files for security
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupSettings.encryption}
                  onChange={(e) => setBackupSettings({...backupSettings, encryption: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Compression
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Compress backup files to save space
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupSettings.compression}
                  onChange={(e) => setBackupSettings({...backupSettings, compression: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cloud Storage
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Store backups in cloud storage
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupSettings.cloudStorage}
                  onChange={(e) => setBackupSettings({...backupSettings, cloudStorage: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Local Storage
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Keep local copies of backups
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupSettings.localStorage}
                  onChange={(e) => setBackupSettings({...backupSettings, localStorage: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Backup Status */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Backup Status
          </h4>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Last Backup:</span>
              <span className="text-gray-900 dark:text-white">{backupSettings.lastBackup}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Next Backup:</span>
              <span className="text-gray-900 dark:text-white">{backupSettings.nextBackup}</span>
            </div>
          </div>
        </div>

        {/* Manual Actions */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Manual Actions
          </h4>
          <div className="flex space-x-3">
            <button className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              <CloudArrowUpIcon className="w-4 h-4 mr-2" />
              Backup Now
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
              Restore
            </button>
          </div>
        </div>

        {/* Backup History */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Recent Backups
          </h4>
          <div className="space-y-2">
            {backupHistory.map((backup) => (
              <div key={backup.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    backup.status === 'Completed' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {backup.type}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {backup.date}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-900 dark:text-white">
                    {backup.size}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {backup.duration}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
