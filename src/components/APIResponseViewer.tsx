"use client";

import React, { useState } from "react";
import { 
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  EyeSlashIcon
} from "@heroicons/react/24/outline";

export default function APIResponseViewer() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [response, setResponse] = useState({
    status: 200,
    statusText: "OK",
    headers: {
      "Content-Type": "application/json",
      "X-RateLimit-Limit": "1000",
      "X-RateLimit-Remaining": "999",
      "X-RateLimit-Reset": "1640995200"
    },
    body: {
      "success": true,
      "data": {
        "calls": [
          {
            "id": "call_123",
            "status": "completed",
            "duration": 180,
            "agent_id": "agent_456",
            "customer_phone": "+1234567890",
            "started_at": "2024-01-15T10:30:00Z",
            "ended_at": "2024-01-15T10:33:00Z",
            "quality_score": 8.5,
            "transcript": "Customer called about billing inquiry..."
          },
          {
            "id": "call_124",
            "status": "in_progress",
            "duration": 45,
            "agent_id": "agent_789",
            "customer_phone": "+1987654321",
            "started_at": "2024-01-15T11:00:00Z",
            "ended_at": null,
            "quality_score": null,
            "transcript": "Customer calling about product support..."
          }
        ],
        "pagination": {
          "page": 1,
          "per_page": 20,
          "total": 2,
          "total_pages": 1
        }
      },
      "message": "Calls retrieved successfully"
    },
    timing: {
      "total": 245,
      "dns": 12,
      "connect": 45,
      "ssl": 23,
      "ttfb": 67,
      "download": 98
    }
  });

  const [showHeaders, setShowHeaders] = useState(true);
  const [showTiming, setShowTiming] = useState(true);

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "text-green-600";
    if (status >= 300 && status < 400) return "text-blue-600";
    if (status >= 400 && status < 500) return "text-yellow-600";
    if (status >= 500) return "text-red-600";
    return "text-gray-600";
  };

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) return CheckCircleIcon;
    if (status >= 400) return XCircleIcon;
    return ClockIcon;
  };

  const StatusIcon = getStatusIcon(response.status);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <StatusIcon className={`w-5 h-5 ${getStatusColor(response.status)}`} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Response
            </h3>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(response.status)} bg-gray-100 dark:bg-gray-700`}>
              {response.status} {response.statusText}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowHeaders(!showHeaders)}
              className="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              {showHeaders ? <EyeSlashIcon className="w-4 h-4 mr-1" /> : <EyeIcon className="w-4 h-4 mr-1" />}
              Headers
            </button>
            <button
              onClick={() => setShowTiming(!showTiming)}
              className="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              {showTiming ? <EyeSlashIcon className="w-4 h-4 mr-1" /> : <EyeIcon className="w-4 h-4 mr-1" />}
              Timing
            </button>
            <button className="inline-flex items-center px-3 py-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
              <DocumentDuplicateIcon className="w-4 h-4 mr-1" />
              Copy
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Response Headers */}
        {showHeaders && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Response Headers
            </h4>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="space-y-2">
                {Object.entries(response.headers).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="font-mono text-gray-600 dark:text-gray-400">{key}:</span>
                    <span className="font-mono text-gray-900 dark:text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Response Body */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Response Body
          </h4>
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-gray-100 font-mono">
              {JSON.stringify(response.body, null, 2)}
            </pre>
          </div>
        </div>

        {/* Timing Information */}
        {showTiming && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Timing Information
            </h4>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {response.timing.total}ms
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total Time</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {response.timing.dns}ms
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">DNS Lookup</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {response.timing.connect}ms
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Connection</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {response.timing.ssl}ms
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">SSL Handshake</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {response.timing.ttfb}ms
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Time to First Byte</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {response.timing.download}ms
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Download</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Response Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <CheckCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Request Successful
              </h5>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                The API request completed successfully in {response.timing.total}ms. 
                Retrieved {response.body.data.calls.length} call records with pagination support.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
