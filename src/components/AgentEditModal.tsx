"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "./ui/modal";
import Form from "./form/Form";
import Label from "./form/Label";
import TextArea from "./form/input/TextArea";
import Button from "./ui/button/Button";
import Alert from "./ui/alert/Alert";
import Input from "./form/input/InputField";
import Select from "./form/Select";

interface Agent {
  id: string;
  name: string;
  type: "voice" | "chat";
  is_active: boolean;
  description?: string;
  configuration?: {
    prompt?: string;
    llm?: {
      provider?: string;
      model?: string;
      temperature?: number;
      max_tokens?: number;
      enable_function_calling?: boolean;
    };
    voice?: {
      voice_id?: string;
      voice_temperature?: number;
      voice_speed?: number;
      volume?: number;
      responsiveness?: number;
      interruption_sensitivity?: number;
      language?: string;
    };
    dynamic_variables?: string[];
    [key: string]: any;
  };
  retell_agent_id?: string;
}

interface AgentEditModalProps {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type TabType = "agent" | "llm" | "prompt";

export default function AgentEditModal({
  agent,
  isOpen,
  onClose,
  onSuccess,
}: AgentEditModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("agent");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Agent Configuration State
  const [agentName, setAgentName] = useState("");
  const [agentType, setAgentType] = useState<"voice" | "chat">("voice");
  const [agentDescription, setAgentDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Voice Configuration State
  const [voiceId, setVoiceId] = useState("");
  const [voiceTemperature, setVoiceTemperature] = useState(0.7);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [volume, setVolume] = useState(80);
  const [responsiveness, setResponsiveness] = useState(0.8);
  const [interruptionSensitivity, setInterruptionSensitivity] = useState(0.5);
  const [language, setLanguage] = useState("en-US");

  // LLM Configuration State
  const [llmProvider, setLlmProvider] = useState("openai");
  const [llmModel, setLlmModel] = useState("gpt-4");
  const [llmTemperature, setLlmTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [enableFunctionCalling, setEnableFunctionCalling] = useState(true);
  const [dynamicVariables, setDynamicVariables] = useState<string[]>([]);

  // Prompt State
  const [prompt, setPrompt] = useState("");

  // Voice options
  const voiceOptions = [
    { value: "sarah-neural", label: "Sarah (Neural)", gender: "Female" },
    { value: "marcus-neural", label: "Marcus (Neural)", gender: "Male" },
    { value: "elena-neural", label: "Elena (Neural)", gender: "Female" },
    { value: "david-standard", label: "David (Standard)", gender: "Male" },
  ];

  const llmProviders = [
    { value: "openai", label: "OpenAI" },
    { value: "anthropic", label: "Anthropic" },
    { value: "google", label: "Google" },
  ];

  const llmModels: Record<string, string[]> = {
    openai: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
    anthropic: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
    google: ["gemini-pro", "gemini-pro-vision"],
  };

  // Fetch agent details from API when modal opens
  useEffect(() => {
    if (agent && isOpen) {
      const fetchAgentData = async () => {
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
          const response = await fetch(`/api/agents/${agent.id}`);
          if (response.ok) {
            const data = await response.json();
            const agentData = data.agent;
            
            // Handle configuration - it might be a string or object
            let config: any = {};
            if (agentData.configuration) {
              if (typeof agentData.configuration === 'string') {
                try {
                  config = JSON.parse(agentData.configuration);
                } catch (e) {
                  console.error('Failed to parse configuration:', e);
                  config = {};
                }
              } else if (typeof agentData.configuration === 'object') {
                config = agentData.configuration;
              }
            }

            // Agent Configuration
            setAgentName(agentData.name || "");
            setAgentType(agentData.type || "voice");
            setAgentDescription(agentData.description || "");
            setIsActive(agentData.is_active !== false);

            // Voice Configuration
            const voiceConfig = config.voice || {};
            setVoiceId(voiceConfig.voice_id || "sarah-neural");
            setVoiceTemperature(voiceConfig.voice_temperature ?? 0.7);
            setVoiceSpeed(voiceConfig.voice_speed ?? 1.0);
            setVolume(voiceConfig.volume ?? 80);
            setResponsiveness(voiceConfig.responsiveness ?? 0.8);
            setInterruptionSensitivity(voiceConfig.interruption_sensitivity ?? 0.5);
            setLanguage(voiceConfig.language || "en-US");

            // LLM Configuration
            const llmConfig = config.llm_config || config.llm || {};
            setLlmProvider(llmConfig.provider || "openai");
            setLlmModel(llmConfig.model || "gpt-4");
            setLlmTemperature(llmConfig.temperature ?? 0.7);
            setMaxTokens(llmConfig.max_tokens ?? 1000);
            setEnableFunctionCalling(llmConfig.enable_function_calling !== false);
            setDynamicVariables(config.dynamic_variables || []);

            // Prompt - check multiple possible locations
            // Retell agents store prompt in different places:
            // - llm_websocket_url (for custom LLM)
            // - system_instructions (common field)
            // - prompt (direct field)
            // - systemPrompt (alternative naming)
            // - llm_config.system_instructions (nested)
            const promptValue = 
              config.prompt || 
              config.system_instructions || 
              config.systemPrompt ||
              llmConfig.system_instructions ||
              llmConfig.prompt ||
              config.llm_websocket_url || // Sometimes used for custom prompts
              "";
            
            console.log('Config structure:', { config, llmConfig, promptValue });
            setPrompt(promptValue);
          } else {
            const errorData = await response.json();
            setError(errorData.error || "Failed to load agent data");
          }
        } catch (error: any) {
          console.error("Failed to fetch agent data:", error);
          setError(error.message || "Failed to load agent data");
        } finally {
          setIsLoading(false);
        }
      };

      fetchAgentData();
    } else if (!isOpen) {
      // Reset when modal closes
      setActiveTab("agent");
      setError(null);
      setSuccess(null);
    }
  }, [agent, isOpen]);

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && 'preventDefault' in e) {
      e.preventDefault();
    }
    setError(null);
    setSuccess(null);

    if (!agent) {
      setError("No agent selected");
      return;
    }

    setIsSubmitting(true);

    try {
      // Build configuration object
      const configuration = {
        prompt: prompt,
        llm: {
          provider: llmProvider,
          model: llmModel,
          temperature: llmTemperature,
          max_tokens: maxTokens,
          enable_function_calling: enableFunctionCalling,
        },
        voice: {
          voice_id: voiceId,
          voice_temperature: voiceTemperature,
          voice_speed: voiceSpeed,
          volume: volume,
          responsiveness: responsiveness,
          interruption_sensitivity: interruptionSensitivity,
          language: language,
        },
        dynamic_variables: dynamicVariables,
      };

      // Update agent via PATCH endpoint
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agentName,
          type: agentType,
          description: agentDescription,
          is_active: isActive,
          configuration: configuration,
        }),
      });

      if (response.ok) {
        setSuccess("Agent updated successfully!");
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to update agent");
      }
    } catch (error: any) {
      console.error("Failed to update agent:", error);
      setError(error.message || "Failed to update agent");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDynamicVariable = (variable: string) => {
    setDynamicVariables((prev) =>
      prev.includes(variable)
        ? prev.filter((v) => v !== variable)
        : [...prev, variable]
    );
  };

  if (!agent) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Agent: ${agent.name}`}>
      <div className="flex flex-col h-full max-h-[80vh]">
        {/* Alerts */}
        {(error || success) && (
          <div className="px-6 pt-4 flex-shrink-0">
            {error && (
              <div className="mb-4">
                <Alert variant="error" title="Error" message={error} />
              </div>
            )}
            {success && (
              <div className="mb-4">
                <Alert variant="success" title="Success" message={success} />
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 pt-4 flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={() => setActiveTab("agent")}
            className={`px-4 py-3 font-medium text-sm transition-colors relative ${
              activeTab === "agent"
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Agent Configuration
            {activeTab === "agent" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("llm")}
            className={`px-4 py-3 font-medium text-sm transition-colors relative ${
              activeTab === "llm"
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            LLM Configuration
            {activeTab === "llm" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("prompt")}
            className={`px-4 py-3 font-medium text-sm transition-colors relative ${
              activeTab === "prompt"
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Prompt
            {activeTab === "prompt" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"></span>
            )}
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">

          {isLoading ? (
            <div className="py-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">Loading agent data...</p>
            </div>
          ) : (
            <Form onSubmit={handleSubmit}>
              {/* Agent Configuration Tab */}
              {activeTab === "agent" && (
                <div className="space-y-5">
                <div>
                  <Label htmlFor="agent-name">Agent Name</Label>
                  <Input
                    id="agent-name"
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="agent-type">Type</Label>
                  <Select
                    id="agent-type"
                    value={agentType}
                    onChange={(value) => setAgentType(value as "voice" | "chat")}
                    disabled={isSubmitting}
                    options={[
                      { value: "voice", label: "Voice Agent" },
                      { value: "chat", label: "Chat Agent" },
                    ]}
                  />
                </div>

                <div>
                  <Label htmlFor="agent-description">Description</Label>
                  <TextArea
                    id="agent-description"
                    value={agentDescription}
                    onChange={(value: string) => setAgentDescription(value)}
                    disabled={isSubmitting}
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is-active"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    disabled={isSubmitting}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <Label htmlFor="is-active" className="mb-0">
                    Active
                  </Label>
                </div>

                {/* Voice-specific settings */}
                {agentType === "voice" && (
                  <>
                    <div>
                      <Label htmlFor="voice-id">Voice Selection</Label>
                      <Select
                        id="voice-id"
                        value={voiceId}
                        onChange={(value) => setVoiceId(value)}
                        disabled={isSubmitting}
                        options={voiceOptions.map((v) => ({
                          value: v.value,
                          label: `${v.label} (${v.gender})`,
                        }))}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="voice-temperature" className="mb-0">
                          Voice Temperature
                        </Label>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {voiceTemperature.toFixed(1)}
                        </span>
                      </div>
                      <input
                        type="range"
                        id="voice-temperature"
                        min="0"
                        max="1"
                        step="0.1"
                        value={voiceTemperature}
                        onChange={(e) => setVoiceTemperature(parseFloat(e.target.value))}
                        disabled={isSubmitting}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-600"
                      />
                      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                        Controls voice naturalness (0 = robotic, 1 = very natural)
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="voice-speed" className="mb-0">
                          Voice Speed
                        </Label>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {voiceSpeed.toFixed(1)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        id="voice-speed"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={voiceSpeed}
                        onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                        disabled={isSubmitting}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-600"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="volume" className="mb-0">
                          Volume
                        </Label>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {volume}%
                        </span>
                      </div>
                      <input
                        type="range"
                        id="volume"
                        min="0"
                        max="100"
                        step="1"
                        value={volume}
                        onChange={(e) => setVolume(parseInt(e.target.value))}
                        disabled={isSubmitting}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-600"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="responsiveness" className="mb-0">
                          Responsiveness
                        </Label>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {responsiveness.toFixed(1)}
                        </span>
                      </div>
                      <input
                        type="range"
                        id="responsiveness"
                        min="0"
                        max="1"
                        step="0.1"
                        value={responsiveness}
                        onChange={(e) => setResponsiveness(parseFloat(e.target.value))}
                        disabled={isSubmitting}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-600"
                      />
                      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                        How quickly the agent responds to customer input
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="interruption-sensitivity" className="mb-0">
                          Interruption Sensitivity
                        </Label>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {interruptionSensitivity.toFixed(1)}
                        </span>
                      </div>
                      <input
                        type="range"
                        id="interruption-sensitivity"
                        min="0"
                        max="1"
                        step="0.1"
                        value={interruptionSensitivity}
                        onChange={(e) =>
                          setInterruptionSensitivity(parseFloat(e.target.value))
                        }
                        disabled={isSubmitting}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-600"
                      />
                      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                        How easily customers can interrupt the agent
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="language">Language</Label>
                      <Select
                        id="language"
                        value={language}
                        onChange={(value) => setLanguage(value)}
                        disabled={isSubmitting}
                        options={[
                          { value: "en-US", label: "English (US)" },
                          { value: "en-GB", label: "English (UK)" },
                          { value: "es-ES", label: "Spanish (Spain)" },
                          { value: "fr-FR", label: "French" },
                          { value: "de-DE", label: "German" },
                        ]}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

              {/* LLM Configuration Tab */}
              {activeTab === "llm" && (
                <div className="space-y-5">
                  <div>
                  <Label htmlFor="llm-provider">LLM Provider</Label>
                  <Select
                    id="llm-provider"
                    value={llmProvider}
                    onChange={(value) => {
                      setLlmProvider(value);
                      // Reset model to first option for new provider
                      const models = llmModels[value] || [];
                      if (models.length > 0) {
                        setLlmModel(models[0]);
                      }
                    }}
                    disabled={isSubmitting}
                    options={llmProviders.map((p) => ({
                      value: p.value,
                      label: p.label,
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="llm-model">Model Version</Label>
                  <Select
                    id="llm-model"
                    value={llmModel}
                    onChange={(value) => setLlmModel(value)}
                    disabled={isSubmitting}
                    options={(llmModels[llmProvider] || []).map((m) => ({
                      value: m,
                      label: m,
                    }))}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="llm-temperature" className="mb-0">
                      Temperature
                    </Label>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {llmTemperature.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    id="llm-temperature"
                    min="0"
                    max="2"
                    step="0.1"
                    value={llmTemperature}
                    onChange={(e) => setLlmTemperature(parseFloat(e.target.value))}
                    disabled={isSubmitting}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-600"
                  />
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    Controls randomness (0 = deterministic, 2 = very creative)
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="max-tokens" className="mb-0">
                      Max Response Tokens
                    </Label>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {maxTokens}
                    </span>
                  </div>
                  <input
                    type="range"
                    id="max-tokens"
                    min="100"
                    max="4000"
                    step="100"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    disabled={isSubmitting}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-600"
                  />
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    Maximum length of AI responses
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enable-function-calling"
                    checked={enableFunctionCalling}
                    onChange={(e) => setEnableFunctionCalling(e.target.checked)}
                    disabled={isSubmitting}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <Label htmlFor="enable-function-calling" className="mb-0">
                    Enable Function Calling
                  </Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Allow AI to call external APIs and functions
                  </p>
                </div>

                <div>
                  <Label>Dynamic Variables</Label>
                  <div className="mt-2 space-y-2">
                    {["customer_name", "current_time", "order_id", "user_id"].map(
                      (variable) => (
                        <div key={variable} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`var-${variable}`}
                            checked={dynamicVariables.includes(variable)}
                            onChange={() => toggleDynamicVariable(variable)}
                            disabled={isSubmitting}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <Label htmlFor={`var-${variable}`} className="mb-0 font-mono text-sm">
                            {variable}: {"{"}{variable}
                            {"}"}
                          </Label>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

              {/* Prompt Tab */}
              {activeTab === "prompt" && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="prompt">System Instructions</Label>
                    <TextArea
                      id="prompt"
                      placeholder="Enter the agent's system prompt..."
                      rows={12}
                      value={prompt}
                      onChange={(value: string) => setPrompt(value)}
                      disabled={isSubmitting}
                      className="font-mono text-sm"
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Define the agent's personality, behavior, and response style. You can review and append to the existing prompt.
                    </p>
                  </div>
                </div>
              )}
            </Form>
          )}
        </div>

        {/* Fixed Footer with Submit Button */}
        {!isLoading && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 flex-shrink-0 bg-white dark:bg-gray-900">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={() => {
                const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                handleSubmit(fakeEvent);
              }}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
