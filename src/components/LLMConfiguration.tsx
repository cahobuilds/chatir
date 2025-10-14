"use client";

import React, { useState } from "react";

export default function LLMConfiguration() {
  const [llmProvider, setLlmProvider] = useState("openai");
  const [modelVersion, setModelVersion] = useState("gpt-4");
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful customer service AI agent. Be polite, professional, and aim to resolve customer issues efficiently."
  );
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [enableFunctionCalling, setEnableFunctionCalling] = useState(true);

  const llmProviders = [
    { value: "openai", label: "OpenAI", models: ["gpt-4", "gpt-3.5-turbo", "gpt-4-turbo"] },
    { value: "anthropic", label: "Anthropic", models: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"] },
    { value: "google", label: "Google", models: ["gemini-pro", "gemini-pro-vision"] },
    { value: "azure", label: "Azure OpenAI", models: ["gpt-4", "gpt-35-turbo"] }
  ];

  const selectedProvider = llmProviders.find(p => p.value === llmProvider);

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <h3 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
        LLM Configuration
      </h3>

      <div className="space-y-6">
        {/* LLM Provider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            LLM Provider
          </label>
          <select
            value={llmProvider}
            onChange={(e) => setLlmProvider(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            {llmProviders.map((provider) => (
              <option key={provider.value} value={provider.value}>
                {provider.label}
              </option>
            ))}
          </select>
        </div>

        {/* Model Version */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Model Version
          </label>
          <select
            value={modelVersion}
            onChange={(e) => setModelVersion(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            {selectedProvider?.models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        {/* System Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            System Instructions
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            placeholder="Enter system instructions for the AI agent..."
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Define the agent&apos;s personality, behavior, and response style
          </p>
        </div>

        {/* Temperature */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Temperature: {temperature}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="mt-1 w-full"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Controls randomness (0 = deterministic, 2 = very creative)
          </p>
        </div>

        {/* Max Tokens */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Max Response Tokens: {maxTokens}
          </label>
          <input
            type="range"
            min="100"
            max="4000"
            step="100"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
            className="mt-1 w-full"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Maximum length of AI responses
          </p>
        </div>

        {/* Function Calling */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enable Function Calling
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Allow AI to call external APIs and functions
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={enableFunctionCalling}
              onChange={(e) => setEnableFunctionCalling(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
          </label>
        </div>

        {/* Dynamic Variables */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Dynamic Variables
          </label>
          <div className="mt-2 space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Customer Name: {`{customer_name}`}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Current Time: {`{current_time}`}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Account Status: {`{account_status}`}
              </span>
            </div>
          </div>
        </div>

        {/* Fallback Responses */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Fallback Response
          </label>
          <textarea
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            placeholder="I&apos;m sorry, I didn&apos;t understand that. Could you please rephrase your question?"
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button className="rounded-lg bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700">
            Save LLM Settings
          </button>
        </div>
      </div>
    </div>
  );
}
