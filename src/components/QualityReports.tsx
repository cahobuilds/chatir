"use client";

import React, { useState } from "react";
import { 
  DocumentTextIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CalendarIcon,
  UserIcon,
  ChartBarIcon,
  ClockIcon
} from "@heroicons/react/24/outline";

interface QualityReport {
  id: string;
  name: string;
  type: "daily" | "weekly" | "monthly" | "custom";
  period: string;
  generatedBy: string;
  generatedAt: string;
  status: "completed" | "generating" | "failed";
  size: string;
  metrics: {
    totalCalls: number;
    averageScore: number;
    complianceRate: number;
    issuesFound: number;
  };
}

const mockReports: QualityReport[] = [
  {
    id: "1",
    name: "Daily Quality Report - Dec 19, 2024",
    type: "daily",
    period: "2024-12-19",
    generatedBy: "John Smith",
    generatedAt: "2024-12-19 15:30:25",
    status: "completed",
    size: "2.4 MB",
    metrics: {
      totalCalls: 247,
      averageScore: 94.2,
      complianceRate: 98.7,
      issuesFound: 12
    }
  },
  {
    id: "2",
    name: "Weekly Quality Summary - Week 51",
    type: "weekly",
    period: "Dec 16-19, 2024",
    generatedBy: "Sarah Johnson",
    generatedAt: "2024-12-19 14:15:10",
    status: "completed",
    size: "8.7 MB",
    metrics: {
      totalCalls: 1247,
      averageScore: 93.8,
      complianceRate: 97.9,
      issuesFound: 45
    }
  },
  {
    id: "3",
    name: "Monthly Quality Analysis - December 2024",
    type: "monthly",
    period: "December 2024",
    generatedBy: "Mike Chen",
    generatedAt: "2024-12-19 13:45:33",
    status: "completed",
    size: "24.1 MB",
    metrics: {
      totalCalls: 5234,
      averageScore: 92.1,
      complianceRate: 96.8,
      issuesFound: 187
    }
  },
  {
    id: "4",
    name: "Agent Performance Review - Q4 2024",
    type: "custom",
    period: "Oct 1 - Dec 19, 2024",
    generatedBy: "Emily Davis",
    generatedAt: "2024-12-19 12:20:08",
    status: "completed",
    size: "15.3 MB",
    metrics: {
      totalCalls: 12456,
      averageScore: 91.7,
      complianceRate: 95.4,
      issuesFound: 423
    }
  },
  {
    id: "5",
    name: "Compliance Audit Report - December",
    type: "monthly",
    period: "December 2024",
    generatedBy: "David Wilson",
    generatedAt: "2024-12-19 11:30:15",
    status: "generating",
    size: "0 MB",
    metrics: {
      totalCalls: 0,
      averageScore: 0,
      complianceRate: 0,
      issuesFound: 0
    }
  }
];

export default function QualityReports() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const getTypeColor = (type: string) => {
    switch (type) {
      case "daily":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "weekly":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "monthly":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "custom":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "generating":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const filteredReports = mockReports.filter(report => {
    if (filter === "all") return true;
    return report.type === filter;
  });

  const generateNewReport = () => {
    alert("Report generation started. You will be notified when it's ready.");
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DocumentTextIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Quality Reports
            </h3>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Reports</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
            </select>
            <button
              onClick={generateNewReport}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <ChartBarIcon className="w-4 h-4 mr-2" />
              Generate Report
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className={`p-4 border rounded-lg transition-all duration-200 ${
                selectedReport === report.id
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {report.name}
                    </h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(report.type)}`}>
                      {report.type}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                      {report.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <div className="flex items-center space-x-1">
                      <CalendarIcon className="w-3 h-3" />
                      <span>{report.period}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <UserIcon className="w-3 h-3" />
                      <span>By {report.generatedBy}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="w-3 h-3" />
                      <span>{report.generatedAt}</span>
                    </div>
                    <span>Size: {report.size}</span>
                  </div>
                  
                  {/* Report Metrics */}
                  {report.status === "completed" && (
                    <div className="grid grid-cols-4 gap-4 text-xs">
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">Total Calls</div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {report.metrics.totalCalls.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">Avg Score</div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {report.metrics.averageScore}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">Compliance</div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {report.metrics.complianceRate}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">Issues</div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {report.metrics.issuesFound}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {report.status === "generating" && (
                    <div className="flex items-center space-x-2 text-sm text-yellow-600 dark:text-yellow-400">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                      <span>Generating report...</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-1 ml-4">
                  {report.status === "completed" && (
                    <>
                      <button className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400">
                        <ArrowDownTrayIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedReport(selectedReport === report.id ? null : report.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <DocumentTextIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {selectedReport === report.id && report.status === "completed" && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Report Summary
                  </h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Total Calls Analyzed</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {report.metrics.totalCalls.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Average Quality Score</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {report.metrics.averageScore}%
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Compliance Rate</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {report.metrics.complianceRate}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Issues Identified</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {report.metrics.issuesFound}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-3">
                    <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                      View Full Report
                    </button>
                    <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                      Download PDF
                    </button>
                    <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                      Export Data
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {mockReports.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Reports</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {mockReports.filter(r => r.status === "completed").length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {mockReports.filter(r => r.status === "generating").length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Generating</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {mockReports.reduce((sum, r) => sum + r.metrics.totalCalls, 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Calls Analyzed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
