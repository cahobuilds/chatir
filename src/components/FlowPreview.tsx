"use client";

import React, { useState } from "react";
import { 
  EyeIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  SpeakerWaveIcon,
  MicrophoneIcon,
  PhoneIcon
} from "@heroicons/react/24/outline";

interface CallSimulation {
  id: string;
  step: number;
  message: string;
  type: "system" | "user" | "ai";
  timestamp: string;
  duration?: number;
}

const mockSimulation: CallSimulation[] = [
  {
    id: "1",
    step: 1,
    message: "Hello! How can I help you today?",
    type: "ai",
    timestamp: "00:00",
    duration: 3.2
  },
  {
    id: "2",
    step: 2,
    message: "I need help with my billing",
    type: "user",
    timestamp: "00:05",
    duration: 2.1
  },
  {
    id: "3",
    step: 3,
    message: "I understand you need help with billing. Please say your account number.",
    type: "ai",
    timestamp: "00:08",
    duration: 4.5
  },
  {
    id: "4",
    step: 4,
    message: "1234567890",
    type: "user",
    timestamp: "00:15",
    duration: 1.8
  },
  {
    id: "5",
    step: 5,
    message: "Thank you. I found your account. What billing issue can I help you with?",
    type: "ai",
    timestamp: "00:18",
    duration: 3.8
  }
];

export default function FlowPreview() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [simulation, setSimulation] = useState<CallSimulation[]>(mockSimulation);
  const [showTranscript, setShowTranscript] = useState(true);

  const handlePlay = () => {
    setIsPlaying(true);
    setIsPaused(false);
    // Simulate flow execution
    simulateFlow();
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentStep(0);
  };

  const simulateFlow = () => {
    // Simulate step-by-step flow execution
    const interval = setInterval(() => {
      if (isPaused) return;
      
      setCurrentStep(prev => {
        if (prev >= simulation.length - 1) {
          clearInterval(interval);
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2000);

    return () => clearInterval(interval);
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case "ai":
        return <SpeakerWaveIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case "user":
        return <MicrophoneIcon className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case "system":
        return <PhoneIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
      default:
        return <SpeakerWaveIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getMessageColor = (type: string) => {
    switch (type) {
      case "ai":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
      case "user":
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      case "system":
        return "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600";
      default:
        return "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <EyeIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Flow Preview
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePlay}
              disabled={isPlaying}
              className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlayIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handlePause}
              disabled={!isPlaying}
              className="p-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PauseIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleStop}
              disabled={!isPlaying}
              className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <StopIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Call Simulation Status */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Call Simulation
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Step {currentStep + 1} of {simulation.length}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {isPlaying && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-600 dark:text-green-400">
                    {isPaused ? "Paused" : "Running"}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / simulation.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Transcript Toggle */}
        <div className="mb-4">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
          >
            <span>{showTranscript ? "Hide" : "Show"} Transcript</span>
          </button>
        </div>

        {/* Call Transcript */}
        {showTranscript && (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {simulation.map((message, index) => (
              <div
                key={message.id}
                className={`p-3 border rounded-lg transition-all duration-200 ${
                  index <= currentStep
                    ? getMessageColor(message.type)
                    : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 opacity-50"
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getMessageIcon(message.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-900 dark:text-white capitalize">
                        {message.type}
                      </span>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{message.timestamp}</span>
                        {message.duration && (
                          <span>({message.duration}s)</span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {message.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Current Step Highlight */}
        {isPlaying && currentStep < simulation.length && (
          <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-indigo-900 dark:text-indigo-300">
                Current Step: {simulation[currentStep].type}
              </span>
            </div>
            <p className="text-sm text-indigo-800 dark:text-indigo-400">
              {simulation[currentStep].message}
            </p>
          </div>
        )}

        {/* Flow Statistics */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Flow Statistics
          </h4>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {simulation.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Steps</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {simulation.reduce((total, msg) => total + (msg.duration || 0), 0).toFixed(1)}s
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Est. Duration</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
