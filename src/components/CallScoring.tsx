"use client";

import React, { useState } from "react";
import { 
  StarIcon,
  PlayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserIcon
} from "@heroicons/react/24/outline";

interface CallScore {
  id: string;
  agentName: string;
  customerName: string;
  callDate: string;
  duration: string;
  score: number;
  status: "completed" | "in-progress" | "pending";
  categories: {
    greeting: number;
    professionalism: number;
    problemSolving: number;
    closing: number;
    compliance: number;
  };
  notes?: string;
  recordingUrl?: string;
}

const mockCallScores: CallScore[] = [
  {
    id: "1",
    agentName: "Sarah Johnson",
    customerName: "John Smith",
    callDate: "2024-12-19 14:30:25",
    duration: "4:32",
    score: 94,
    status: "completed",
    categories: {
      greeting: 95,
      professionalism: 92,
      problemSolving: 96,
      closing: 90,
      compliance: 98
    },
    notes: "Excellent problem resolution, minor issue with closing script",
    recordingUrl: "/recordings/call-001.mp3"
  },
  {
    id: "2",
    agentName: "Mike Chen",
    customerName: "Emily Davis",
    callDate: "2024-12-19 13:45:12",
    duration: "3:18",
    score: 87,
    status: "completed",
    categories: {
      greeting: 88,
      professionalism: 85,
      problemSolving: 90,
      closing: 82,
      compliance: 92
    },
    notes: "Good overall performance, needs improvement in closing techniques"
  },
  {
    id: "3",
    agentName: "David Wilson",
    customerName: "Lisa Brown",
    callDate: "2024-12-19 12:20:08",
    duration: "5:45",
    score: 91,
    status: "in-progress",
    categories: {
      greeting: 92,
      professionalism: 90,
      problemSolving: 94,
      closing: 88,
      compliance: 95
    }
  },
  {
    id: "4",
    agentName: "Sarah Johnson",
    customerName: "Robert Taylor",
    callDate: "2024-12-19 11:15:33",
    duration: "2:56",
    score: 78,
    status: "completed",
    categories: {
      greeting: 80,
      professionalism: 75,
      problemSolving: 82,
      closing: 70,
      compliance: 85
    },
    notes: "Below average performance, requires coaching on professionalism and closing"
  },
  {
    id: "5",
    agentName: "Mike Chen",
    customerName: "Jennifer Lee",
    callDate: "2024-12-19 10:30:15",
    duration: "6:12",
    score: 96,
    status: "completed",
    categories: {
      greeting: 98,
      professionalism: 95,
      problemSolving: 97,
      closing: 94,
      compliance: 98
    },
    notes: "Outstanding performance across all categories"
  }
];

export default function CallScoring() {
  const [selectedCall, setSelectedCall] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 80) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return "bg-green-100 dark:bg-green-900/20";
    if (score >= 80) return "bg-yellow-100 dark:bg-yellow-900/20";
    return "bg-red-100 dark:bg-red-900/20";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case "in-progress":
        return <ClockIcon className="w-4 h-4 text-blue-500" />;
      case "pending":
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "in-progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const filteredCalls = mockCallScores.filter(call => {
    if (filter === "all") return true;
    return call.status === filter;
  });

  const averageScore = mockCallScores.reduce((sum, call) => sum + call.score, 0) / mockCallScores.length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <StarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Call Scoring & Evaluation
            </h3>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Calls</option>
              <option value="completed">Completed</option>
              <option value="in-progress">In Progress</option>
              <option value="pending">Pending</option>
            </select>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Avg Score: <span className="font-medium text-indigo-600 dark:text-indigo-400">{averageScore.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {filteredCalls.map((call) => (
            <div
              key={call.id}
              className={`p-4 border rounded-lg transition-all duration-200 ${
                selectedCall === call.id
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="flex items-center space-x-2">
                      <UserIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {call.agentName}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">→</span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {call.customerName}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}>
                      {getStatusIcon(call.status)}
                      <span className="ml-1">{call.status}</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <span>{call.callDate}</span>
                    <span>Duration: {call.duration}</span>
                  </div>
                  
                  {/* Score Categories */}
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {Object.entries(call.categories).map(([category, score]) => (
                      <div key={category} className="text-center">
                        <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                          {category.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div className={`text-sm font-medium ${getScoreColor(score)}`}>
                          {score}%
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {call.notes && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      {call.notes}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3 ml-4">
                  <div className={`px-3 py-1 rounded-full ${getScoreBgColor(call.score)}`}>
                    <span className={`text-lg font-bold ${getScoreColor(call.score)}`}>
                      {call.score}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {call.recordingUrl && (
                      <button className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                        <PlayIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedCall(selectedCall === call.id ? null : call.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <StarIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {selectedCall === call.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Detailed Scoring
                  </h5>
                  <div className="space-y-2">
                    {Object.entries(call.categories).map(([category, score]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {category.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                score >= 90 ? "bg-green-500" : score >= 80 ? "bg-yellow-500" : "bg-red-500"
                              }`}
                              style={{ width: `${score}%` }}
                            ></div>
                          </div>
                          <span className={`text-sm font-medium w-8 ${getScoreColor(score)}`}>
                            {score}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {mockCallScores.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Calls</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {mockCallScores.filter(c => c.score >= 90).length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">High Quality</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {mockCallScores.filter(c => c.score < 80).length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Need Improvement</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
