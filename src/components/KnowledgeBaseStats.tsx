"use client";

import React from "react";

interface StatCard {
  title: string;
  value: string | number;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: string;
  color: string;
  description: string;
}

const stats: StatCard[] = [
  {
    title: "Total Documents",
    value: "1,247",
    change: "+23",
    trend: "up",
    icon: "📄",
    color: "bg-blue-500",
    description: "vs last week"
  },
  {
    title: "Categories",
    value: "12",
    change: "+2",
    trend: "up",
    icon: "📁",
    color: "bg-green-500",
    description: "vs last week"
  },
  {
    title: "Search Queries",
    value: "3,456",
    change: "+15%",
    trend: "up",
    icon: "🔍",
    color: "bg-purple-500",
    description: "vs last week"
  },
  {
    title: "Accuracy Score",
    value: "94.2%",
    change: "+1.8%",
    trend: "up",
    icon: "🎯",
    color: "bg-orange-500",
    description: "vs last week"
  },
  {
    title: "Sync Sources",
    value: "8",
    change: "0",
    trend: "neutral",
    icon: "🔄",
    color: "bg-indigo-500",
    description: "active connections"
  },
  {
    title: "Index Size",
    value: "2.3GB",
    change: "+0.2GB",
    trend: "up",
    icon: "💾",
    color: "bg-emerald-500",
    description: "vs last week"
  }
];

export default function KnowledgeBaseStats() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800"
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`rounded-lg p-2 ${stat.color}`}>
              <span className="text-white text-lg">{stat.icon}</span>
            </div>
            <div className={`text-xs font-medium ${
              stat.trend === 'up' ? 'text-green-600' : 
              stat.trend === 'down' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {stat.change}
            </div>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {stat.value}
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {stat.title}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {stat.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
