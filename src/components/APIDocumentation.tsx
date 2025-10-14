"use client";

import React, { useState } from "react";
import { 
  DocumentTextIcon,
  CodeBracketIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";

export default function APIDocumentation() {
  const [expandedSections, setExpandedSections] = useState<string[]>(["authentication", "calls"]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const documentation = [
    {
      id: "authentication",
      title: "Authentication",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            All API requests require authentication using an API key. Include your API key in the Authorization header.
          </p>
          <div className="bg-gray-900 rounded-lg p-4">
            <pre className="text-sm text-gray-100 font-mono">
{`Authorization: Bearer your-api-key-here
Content-Type: application/json`}
            </pre>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> Keep your API key secure and never expose it in client-side code.
            </p>
          </div>
        </div>
      )
    },
    {
      id: "calls",
      title: "Calls API",
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">GET /api/v1/calls</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Retrieve a list of all calls with optional filtering and pagination.</p>
            
            <div className="mb-4">
              <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Query Parameters:</h5>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-mono text-gray-600 dark:text-gray-400">page</span>
                    <span className="text-gray-900 dark:text-white">Page number (default: 1)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-gray-600 dark:text-gray-400">per_page</span>
                    <span className="text-gray-900 dark:text-white">Items per page (default: 20)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-gray-600 dark:text-gray-400">status</span>
                    <span className="text-gray-900 dark:text-white">Filter by call status</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-gray-600 dark:text-gray-400">agent_id</span>
                    <span className="text-gray-900 dark:text-white">Filter by agent ID</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Example Response:</h5>
              <div className="bg-gray-900 rounded-lg p-4">
                <pre className="text-sm text-gray-100 font-mono">
{`{
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
        "quality_score": 8.5
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 1,
      "total_pages": 1
    }
  }
}`}
                </pre>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">POST /api/v1/calls</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Create a new call record.</p>
            
            <div className="mb-4">
              <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Request Body:</h5>
              <div className="bg-gray-900 rounded-lg p-4">
                <pre className="text-sm text-gray-100 font-mono">
{`{
  "customer_phone": "+1234567890",
  "agent_id": "agent_456",
  "call_type": "inbound",
  "priority": "normal"
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "agents",
      title: "Agents API",
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">GET /api/v1/agents</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Retrieve a list of all AI agents.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">POST /api/v1/agents</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Create a new AI agent with configuration.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">POST /api/v1/agents/:id/train</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Train an existing agent with new data.</p>
          </div>
        </div>
      )
    },
    {
      id: "analytics",
      title: "Analytics API",
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">GET /api/v1/analytics/overview</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Get comprehensive analytics overview.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">GET /api/v1/analytics/calls</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Get detailed call analytics with time-based filtering.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">GET /api/v1/analytics/quality</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Get quality metrics and performance indicators.</p>
          </div>
        </div>
      )
    },
    {
      id: "errors",
      title: "Error Handling",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            The API uses standard HTTP status codes to indicate success or failure of requests.
          </p>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                200
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">OK</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Request successful</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                400
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Bad Request</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Invalid request parameters</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                401
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Unauthorized</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Invalid or missing API key</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                429
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Too Many Requests</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Rate limit exceeded</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                500
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Internal Server Error</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Server error occurred</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "rate-limits",
      title: "Rate Limits",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            API requests are rate limited to ensure fair usage and system stability.
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Current Limits:</h5>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• 1000 requests per hour per API key</li>
              <li>• 100 requests per minute for burst traffic</li>
              <li>• Rate limit headers included in all responses</li>
            </ul>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Rate Limit Headers:</h5>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="font-mono text-gray-600 dark:text-gray-400">X-RateLimit-Limit</span>
                <span className="text-gray-900 dark:text-white">1000</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-gray-600 dark:text-gray-400">X-RateLimit-Remaining</span>
                <span className="text-gray-900 dark:text-white">999</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-gray-600 dark:text-gray-400">X-RateLimit-Reset</span>
                <span className="text-gray-900 dark:text-white">1640995200</span>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <DocumentTextIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            API Documentation
          </h3>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {documentation.map((section) => {
            const isExpanded = expandedSections.includes(section.id);
            const Icon = isExpanded ? ChevronDownIcon : ChevronRightIcon;
            
            return (
              <div key={section.id} className="border border-gray-200 dark:border-gray-600 rounded-lg">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {section.title}
                    </h4>
                  </div>
                  <CodeBracketIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </button>
                
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="pt-4">
                      {section.content}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
