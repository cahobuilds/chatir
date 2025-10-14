"use client";

import React, { useState } from "react";
import { 
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  EyeIcon
} from "@heroicons/react/24/outline";

interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: "privacy" | "security" | "regulatory" | "internal";
  severity: "low" | "medium" | "high" | "critical";
  status: "compliant" | "violation" | "warning" | "pending";
  lastChecked: string;
  violations: number;
  totalChecks: number;
}

const mockComplianceRules: ComplianceRule[] = [
  {
    id: "1",
    name: "PCI DSS Compliance",
    description: "Payment card data protection standards",
    category: "regulatory",
    severity: "critical",
    status: "compliant",
    lastChecked: "2024-12-19 14:30:25",
    violations: 0,
    totalChecks: 1247
  },
  {
    id: "2",
    name: "GDPR Data Protection",
    description: "European data privacy regulations",
    category: "privacy",
    severity: "critical",
    status: "compliant",
    lastChecked: "2024-12-19 14:25:15",
    violations: 0,
    totalChecks: 1247
  },
  {
    id: "3",
    name: "Call Recording Consent",
    description: "Customer consent for call recording",
    category: "privacy",
    severity: "high",
    status: "warning",
    lastChecked: "2024-12-19 14:20:10",
    violations: 3,
    totalChecks: 1247
  },
  {
    id: "4",
    name: "Data Retention Policy",
    description: "Automatic data deletion after retention period",
    category: "internal",
    severity: "medium",
    status: "compliant",
    lastChecked: "2024-12-19 14:15:05",
    violations: 0,
    totalChecks: 1247
  },
  {
    id: "5",
    name: "Access Control Audit",
    description: "User access permissions review",
    category: "security",
    severity: "high",
    status: "violation",
    lastChecked: "2024-12-19 14:10:00",
    violations: 2,
    totalChecks: 1247
  },
  {
    id: "6",
    name: "SOX Compliance",
    description: "Sarbanes-Oxley financial reporting controls",
    category: "regulatory",
    severity: "critical",
    status: "compliant",
    lastChecked: "2024-12-19 14:05:55",
    violations: 0,
    totalChecks: 1247
  }
];

const mockViolations = [
  {
    id: "1",
    ruleId: "3",
    ruleName: "Call Recording Consent",
    timestamp: "2024-12-19 13:45:12",
    agentName: "Mike Chen",
    customerId: "CUST-001",
    description: "Call recorded without explicit consent",
    severity: "high",
    status: "open"
  },
  {
    id: "2",
    ruleId: "5",
    ruleName: "Access Control Audit",
    timestamp: "2024-12-19 12:30:08",
    agentName: "David Wilson",
    customerId: "CUST-002",
    description: "Unauthorized access to customer data",
    severity: "critical",
    status: "investigating"
  },
  {
    id: "3",
    ruleId: "3",
    ruleName: "Call Recording Consent",
    timestamp: "2024-12-19 11:15:33",
    agentName: "Sarah Johnson",
    customerId: "CUST-003",
    description: "Missing consent documentation",
    severity: "medium",
    status: "resolved"
  }
];

export default function ComplianceMonitoring() {
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "privacy":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "security":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "regulatory":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "internal":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case "violation":
        return <XCircleIcon className="w-4 h-4 text-red-500" />;
      case "warning":
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />;
      case "pending":
        return <ClockIcon className="w-4 h-4 text-blue-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "compliant":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "violation":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "pending":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getViolationStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "investigating":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const filteredRules = mockComplianceRules.filter(rule => {
    if (filter === "all") return true;
    return rule.status === filter;
  });

  const complianceRate = (mockComplianceRules.filter(r => r.status === "compliant").length / mockComplianceRules.length) * 100;

  return (
    <div className="space-y-6">
      {/* Compliance Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <ShieldCheckIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Compliance Overview
            </h3>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {complianceRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Overall Compliance Rate</div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {mockComplianceRules.filter(r => r.status === "compliant").length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Compliant</div>
            </div>
            <div>
              <div className="text-xl font-bold text-red-600 dark:text-red-400">
                {mockComplianceRules.filter(r => r.status === "violation" || r.status === "warning").length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Issues</div>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Rules */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DocumentTextIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Compliance Rules
              </h3>
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Rules</option>
              <option value="compliant">Compliant</option>
              <option value="violation">Violations</option>
              <option value="warning">Warnings</option>
            </select>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {filteredRules.map((rule) => (
              <div
                key={rule.id}
                className={`p-4 border rounded-lg transition-all duration-200 ${
                  selectedRule === rule.id
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {rule.name}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(rule.category)}`}>
                        {rule.category}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(rule.severity)}`}>
                        {rule.severity}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(rule.status)}`}>
                        {getStatusIcon(rule.status)}
                        <span className="ml-1">{rule.status}</span>
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {rule.description}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Last checked: {rule.lastChecked}</span>
                      <span>Violations: {rule.violations}/{rule.totalChecks}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedRule(selectedRule === rule.id ? null : rule.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                </div>

                {selectedRule === rule.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Compliance Rate
                      </span>
                      <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        {((rule.totalChecks - rule.violations) / rule.totalChecks * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${((rule.totalChecks - rule.violations) / rule.totalChecks * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Violations */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Violations
            </h3>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {mockViolations.map((violation) => (
              <div
                key={violation.id}
                className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {violation.ruleName}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(violation.severity)}`}>
                        {violation.severity}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getViolationStatusColor(violation.status)}`}>
                        {violation.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {violation.description}
                    </p>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Agent: {violation.agentName} • {violation.timestamp}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
