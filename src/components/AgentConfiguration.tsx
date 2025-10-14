"use client";

import React, { useState } from "react";

export default function AgentConfiguration() {
  const [agentName, setAgentName] = useState("AI Agent Alpha");
  const [selectedVoice, setSelectedVoice] = useState("sarah-neural");
  const [voiceTemperature, setVoiceTemperature] = useState(0.7);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [volume, setVolume] = useState(80);
  const [responsiveness, setResponsiveness] = useState(0.8);
  const [interruptionSensitivity, setInterruptionSensitivity] = useState(0.5);
  const [language, setLanguage] = useState("en-US");

  const voiceOptions = [
    { value: "sarah-neural", label: "Sarah (Neural)", gender: "Female" },
    { value: "marcus-neural", label: "Marcus (Neural)", gender: "Male" },
    { value: "elena-neural", label: "Elena (Neural)", gender: "Female" },
    { value: "david-standard", label: "David (Standard)", gender: "Male" }
  ];

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <h3 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
        Agent Configuration
      </h3>

      <div className="space-y-6">
        {/* Agent Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Agent Name
          </label>
          <input
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Voice Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Voice Selection
          </label>
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            {voiceOptions.map((voice) => (
              <option key={voice.value} value={voice.value}>
                {voice.label} ({voice.gender})
              </option>
            ))}
          </select>
        </div>

        {/* Voice Temperature */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Voice Temperature: {voiceTemperature}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={voiceTemperature}
            onChange={(e) => setVoiceTemperature(parseFloat(e.target.value))}
            className="mt-1 w-full"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Controls voice naturalness (0 = robotic, 1 = very natural)
          </p>
        </div>

        {/* Voice Speed */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Voice Speed: {voiceSpeed}x
          </label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={voiceSpeed}
            onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
            className="mt-1 w-full"
          />
        </div>

        {/* Volume */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Volume: {volume}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(parseInt(e.target.value))}
            className="mt-1 w-full"
          />
        </div>

        {/* Responsiveness */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Responsiveness: {responsiveness}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={responsiveness}
            onChange={(e) => setResponsiveness(parseFloat(e.target.value))}
            className="mt-1 w-full"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            How quickly the agent responds to customer input
          </p>
        </div>

        {/* Interruption Sensitivity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Interruption Sensitivity: {interruptionSensitivity}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={interruptionSensitivity}
            onChange={(e) => setInterruptionSensitivity(parseFloat(e.target.value))}
            className="mt-1 w-full"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            How easily customers can interrupt the agent
          </p>
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="es-ES">Spanish</option>
            <option value="fr-FR">French</option>
            <option value="de-DE">German</option>
            <option value="it-IT">Italian</option>
          </select>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button className="rounded-lg bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700">
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
