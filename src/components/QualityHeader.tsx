"use client";

import React from "react";
import { 
  ShieldCheckIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";

export default function QualityHeader() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
            <ShieldCheckIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Quality Assurance & Compliance
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Monitor call quality, compliance metrics, and agent performance
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            <DocumentTextIcon className="w-4 h-4 mr-2" />
            Export Report
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            <ChartBarIcon className="w-4 h-4 mr-2" />
            Generate Report
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center">
            <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Quality Score
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                94.2%
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center">
            <ShieldCheckIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Compliance Rate
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                98.7%
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Issues Found
              </p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                12
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center">
            <ChartBarIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                Calls Reviewed
              </p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                1,247
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
