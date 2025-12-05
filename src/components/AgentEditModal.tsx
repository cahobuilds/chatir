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
import { useOrganization } from "@/context/OrganizationContext";

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
  const { currentOrganization } = useOrganization();
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

  // LLM Configuration State (Retell API compatible)
  const [llmModel, setLlmModel] = useState("gpt-4.1");
  const [llmTemperature, setLlmTemperature] = useState(0.7);
  const [toolCallStrictMode, setToolCallStrictMode] = useState(false);
  const [dynamicVariables, setDynamicVariables] = useState<string[]>([]);

  // Prompt State
  const [prompt, setPrompt] = useState("");

  // Voice options - will be populated from Retell API
  const [voiceOptions, setVoiceOptions] = useState<Array<{ value: string; label: string; gender: string }>>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);

  // Fetch available voices from Retell AI when modal opens
  useEffect(() => {
    if (isOpen && currentOrganization?.id) {
      const fetchVoices = async () => {
        setVoicesLoading(true);
        try {
          const response = await fetch(`/api/retell/voices?tenant_id=${currentOrganization.id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.voices && Array.isArray(data.voices)) {
              // Transform Retell voices to dropdown options
              const options = data.voices.map((voice: any) => ({
                value: voice.voice_id,
                label: voice.voice_name 
                  ? `${voice.voice_name} (${voice.provider || 'unknown'})`
                  : voice.voice_id.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                gender: voice.gender || 'Unknown',
              }));
              setVoiceOptions(options);
            }
          } else {
            console.warn('Failed to fetch voices from Retell:', await response.json());
            // Fallback to empty array - ensureVoiceOption will add voices as needed
            setVoiceOptions([]);
          }
        } catch (error: any) {
          console.warn('Error fetching voices from Retell:', error);
          // Fallback to empty array - ensureVoiceOption will add voices as needed
          setVoiceOptions([]);
        } finally {
          setVoicesLoading(false);
        }
      };
      fetchVoices();
    }
  }, [isOpen, currentOrganization?.id]);

  // Helper function to add a voice option if it doesn't exist (for backward compatibility)
  const ensureVoiceOption = (voiceId: string) => {
    if (!voiceId) return;
    setVoiceOptions((prev) => {
      const exists = prev.some((v) => v.value === voiceId);
      if (!exists) {
        // Format the voice_id for display
        // Examples: "11labs-Cimo" -> "Cimo (11labs)", "sarah-neural" -> "Sarah (Neural)"
        let displayName = voiceId;
        if (voiceId.includes("-")) {
          const parts = voiceId.split("-");
          if (parts.length === 2) {
            // Format as "VoiceName (Provider)" for provider-voice pattern
            const provider = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            const voiceName = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
            displayName = `${voiceName} (${provider})`;
          } else {
            // Multiple parts: capitalize each word
            displayName = parts
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");
          }
        } else {
          // Single word: capitalize first letter
          displayName = voiceId.charAt(0).toUpperCase() + voiceId.slice(1);
        }
        return [
          ...prev,
          { value: voiceId, label: displayName, gender: "Unknown" },
        ];
      }
      return prev;
    });
  };

  // Retell AI supported models (from LlmUpdateParams)
  const retellModels = [
    { value: "gpt-5", label: "GPT-5" },
    { value: "gpt-5-mini", label: "GPT-5 Mini" },
    { value: "gpt-5-nano", label: "GPT-5 Nano" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4.1", label: "GPT-4.1 (Default)" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
    { value: "gpt-4.1-nano", label: "GPT-4.1 Nano" },
    { value: "claude-3.7-sonnet", label: "Claude 3.7 Sonnet" },
    { value: "claude-3.5-haiku", label: "Claude 3.5 Haiku" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  ];
  
  // Models that support tool_call_strict_mode
  const strictModeSupportedModels = ["gpt-4o", "gpt-4o-mini"];

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
            // Read from both top-level (from sync) and nested (legacy) locations for backward compatibility
            const voiceConfig = config.voice || {};
            const voiceIdFromConfig = config.voice_id || voiceConfig.voice_id || "sarah-neural";
            // Ensure the voice option exists in the dropdown
            ensureVoiceOption(voiceIdFromConfig);
            setVoiceId(voiceIdFromConfig);
            setVoiceTemperature(voiceConfig.voice_temperature ?? 0.7);
            setVoiceSpeed(voiceConfig.voice_speed ?? 1.0);
            // Handle volume: if stored in Retell format (0-2), convert to percentage (0-100)
            // Retell: 0-2 scale (2 = 100%), UI: 0-100% scale
            // Conversion: Retell value * 50 = percentage (2 * 50 = 100%)
            const volumeValue = voiceConfig.volume ?? config.volume ?? 80;
            setVolume(volumeValue <= 2 ? Math.round(volumeValue * 50) : volumeValue);
            setResponsiveness(voiceConfig.responsiveness ?? 0.8);
            setInterruptionSensitivity(voiceConfig.interruption_sensitivity ?? 0.5);
            setLanguage(config.language || voiceConfig.language || "en-US");

            // LLM Configuration (Retell API compatible)
            const llmConfig = config.llm_config || config.llm || {};
            // Use Retell model names directly (no provider concept)
            setLlmModel(llmConfig.model || "gpt-4.1");
            // Prefer model_temperature (Retell API field) over temperature (legacy)
            setLlmTemperature(llmConfig.model_temperature ?? llmConfig.temperature ?? 0.7);
            setToolCallStrictMode(llmConfig.tool_call_strict_mode ?? false);
            // Handle dynamic variables - can be array or object
            if (Array.isArray(config.dynamic_variables)) {
              setDynamicVariables(config.dynamic_variables);
            } else if (config.default_dynamic_variables && typeof config.default_dynamic_variables === 'object') {
              setDynamicVariables(Object.keys(config.default_dynamic_variables));
            } else {
              setDynamicVariables([]);
            }

            // Prompt - check multiple possible locations
            // Agents store prompt in different places:
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

            // If agent is linked to Retell, fetch current config from Retell API (source of truth)
            if (agentData.retell_agent_id) {
              try {
                // Fetch Retell agent details (includes voice_id and other agent-level config)
                const retellAgentResponse = await fetch(`/api/retell/agents/${agent.id}`);
                if (retellAgentResponse.ok) {
                  const retellAgentData = await retellAgentResponse.json();
                  const retellAgent = retellAgentData.retell_agent;
                  if (retellAgent) {
                    // Debug: Log full Retell response to see actual structure
                    console.log('[AgentEditModal] Full Retell agent response:', JSON.stringify(retellAgent, null, 2));
                    console.log('[AgentEditModal] Retell agent voice fields:', {
                      voice_id: retellAgent.voice_id,
                      voice_temperature: retellAgent.voice_temperature,
                      voice_speed: retellAgent.voice_speed,
                      volume: retellAgent.volume,
                      responsiveness: retellAgent.responsiveness,
                      interruption_sensitivity: retellAgent.interruption_sensitivity,
                      language: retellAgent.language,
                      // Check for nested structures
                      voice: retellAgent.voice,
                      voice_config: retellAgent.voice_config,
                    });

                    // Override voice_id with Retell's current value (source of truth)
                    if (retellAgent.voice_id) {
                      // Ensure the voice option exists in the dropdown
                      ensureVoiceOption(retellAgent.voice_id);
                      setVoiceId(retellAgent.voice_id);
                    }
                    // Override language with Retell's current value
                    if (retellAgent.language) {
                      setLanguage(retellAgent.language);
                    }
                    // Override voice configuration fields with Retell's current values (source of truth)
                    // Retell API returns these values directly
                    if (retellAgent.voice_temperature !== undefined && retellAgent.voice_temperature !== null) {
                      console.log('[AgentEditModal] Setting voice_temperature from Retell:', retellAgent.voice_temperature);
                      setVoiceTemperature(retellAgent.voice_temperature);
                    }
                    if (retellAgent.voice_speed !== undefined && retellAgent.voice_speed !== null) {
                      console.log('[AgentEditModal] Setting voice_speed from Retell:', retellAgent.voice_speed);
                      setVoiceSpeed(retellAgent.voice_speed);
                    }
                    if (retellAgent.volume !== undefined && retellAgent.volume !== null) {
                      // Retell uses 0-2 scale (2.0 = 100%), our UI uses 0-100 scale
                      // Convert Retell value to percentage: multiply by 50 (2 * 50 = 100%)
                      const volumePercentage = Math.round(retellAgent.volume * 50);
                      console.log('[AgentEditModal] Setting volume from Retell:', retellAgent.volume, '->', volumePercentage + '%');
                      setVolume(volumePercentage);
                    }
                    if (retellAgent.responsiveness !== undefined && retellAgent.responsiveness !== null) {
                      console.log('[AgentEditModal] Setting responsiveness from Retell:', retellAgent.responsiveness);
                      setResponsiveness(retellAgent.responsiveness);
                    }
                    if (retellAgent.interruption_sensitivity !== undefined && retellAgent.interruption_sensitivity !== null) {
                      console.log('[AgentEditModal] Setting interruption_sensitivity from Retell:', retellAgent.interruption_sensitivity);
                      setInterruptionSensitivity(retellAgent.interruption_sensitivity);
                    }
                  }
                } else {
                  console.warn("Failed to fetch Retell agent config:", await retellAgentResponse.json());
                }
              } catch (retellError: any) {
                // Non-critical error - use local config as fallback
                console.warn("Error fetching Retell agent config:", retellError);
              }

              // Fetch LLM config from Retell API (if agent uses Retell LLM)
              try {
                const llmConfigResponse = await fetch(`/api/agents/${agent.id}/llm-config`);
                if (llmConfigResponse.ok) {
                  const retellLlmData = await llmConfigResponse.json();
                  const retellLlm = retellLlmData.llm;
                  if (retellLlm) {
                    // Override local config with Retell config (source of truth)
                    setLlmModel(retellLlm.model || llmModel);
                    setLlmTemperature(retellLlm.model_temperature ?? llmTemperature);
                    setToolCallStrictMode(retellLlm.tool_call_strict_mode ?? false);
                    if (retellLlm.general_prompt) {
                      setPrompt(retellLlm.general_prompt);
                    }
                    // Handle dynamic variables from Retell
                    if (retellLlm.default_dynamic_variables && typeof retellLlm.default_dynamic_variables === 'object') {
                      setDynamicVariables(Object.keys(retellLlm.default_dynamic_variables));
                    }
                  }
                } else {
                  // Agent might not use Retell LLM, or error fetching - use local config
                  console.warn("Failed to fetch Retell LLM config:", await llmConfigResponse.json());
                }
              } catch (llmError: any) {
                // Non-critical error - use local config as fallback
                console.warn("Error fetching Retell LLM config:", llmError);
              }
            }
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
      // Build configuration object (Retell API compatible)
      // Store voice_id at both top-level (for Retell sync compatibility) and nested (for UI compatibility)
      const configuration = {
        prompt: prompt,
        voice_id: voiceId, // Top-level for Retell sync compatibility
        language: language, // Top-level for Retell sync compatibility
        llm: {
          model: llmModel,
          model_temperature: llmTemperature, // Use model_temperature for Retell API
          tool_call_strict_mode: toolCallStrictMode,
        },
        voice: {
          voice_id: voiceId, // Nested for UI compatibility
          voice_temperature: voiceTemperature,
          voice_speed: voiceSpeed,
          volume: volume / 50, // Convert UI percentage (0-100) to Retell scale (0-2): divide by 50 (100% / 50 = 2.0)
          responsiveness: responsiveness,
          interruption_sensitivity: interruptionSensitivity,
          language: language,
        },
        default_dynamic_variables: dynamicVariables.reduce((acc, key) => {
          acc[key] = `{${key}}`; // Format as key-value pairs for Retell
          return acc;
        }, {} as Record<string, string>),
      };

      // Update agent basic info via PATCH endpoint
      const agentResponse = await fetch(`/api/agents/${agent.id}`, {
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

      if (!agentResponse.ok) {
        const errorData = await agentResponse.json();
        setError(errorData.error || "Failed to update agent");
        setIsSubmitting(false);
        return;
      }

      // Always sync LLM config to Retell if agent is linked (regardless of active tab)
      if (agent.retell_agent_id) {
        try {
          const llmConfigResponse = await fetch(`/api/agents/${agent.id}/llm-config`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: llmModel,
              model_temperature: llmTemperature,
              tool_call_strict_mode: toolCallStrictMode,
              general_prompt: prompt,
              default_dynamic_variables: dynamicVariables.reduce((acc, key) => {
                acc[key] = `{${key}}`; // Format as key-value pairs for Retell
                return acc;
              }, {} as Record<string, string>),
            }),
          });

          if (llmConfigResponse.ok) {
            const llmData = await llmConfigResponse.json();
            setSuccess(llmData.message || "Agent and LLM configuration updated successfully!");
          } else {
            const llmErrorData = await llmConfigResponse.json();
            // Show warning but don't fail - agent was updated successfully
            setSuccess(`Agent updated successfully. ${llmErrorData.warning || llmErrorData.error || 'LLM config may not have synced to Retell.'}`);
          }
        } catch (llmError: any) {
          console.error("Failed to update LLM config:", llmError);
          // Don't fail - agent was updated successfully
          setSuccess("Agent updated successfully. LLM config sync may have failed.");
        }
      } else {
        setSuccess("Agent updated successfully!");
      }

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
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
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Agent ID:</span>
                    <code className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-700">
                      {agent.id}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(agent.id);
                        setSuccess("Agent ID copied to clipboard!");
                        setTimeout(() => setSuccess(null), 2000);
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                      title="Copy Agent ID"
                    >
                      Copy
                    </button>
                  </div>
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
                      {voicesLoading ? (
                        <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                          Loading voices from Retell AI...
                        </div>
                      ) : voiceOptions.length === 0 ? (
                        <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                          No voices available. Please ensure Retell AI is configured.
                        </div>
                      ) : (
                        <Select
                          id="voice-id"
                          value={voiceId}
                          onChange={(value) => setVoiceId(value)}
                          disabled={isSubmitting || voicesLoading}
                          options={voiceOptions.map((v) => ({
                            value: v.value,
                            label: `${v.label} (${v.gender})`,
                          }))}
                        />
                      )}
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
                        max="2"
                        step="0.1"
                        value={voiceTemperature}
                        onChange={(e) => setVoiceTemperature(parseFloat(e.target.value))}
                        disabled={isSubmitting}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-600"
                      />
                      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                        Controls voice naturalness (0 = robotic, 2 = very natural)
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
                    <Label htmlFor="llm-model">Model</Label>
                    <Select
                      id="llm-model"
                      value={llmModel}
                      onChange={(value) => {
                        setLlmModel(value);
                        // Reset tool_call_strict_mode if model doesn't support it
                        if (!strictModeSupportedModels.includes(value)) {
                          setToolCallStrictMode(false);
                        }
                      }}
                      disabled={isSubmitting}
                      options={retellModels.map((m) => ({
                        value: m.value,
                        label: m.label,
                      }))}
                    />
                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      Select the underlying text LLM. Default is GPT-4.1.
                    </p>
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
                    max="1"
                    step="0.1"
                    value={llmTemperature}
                    onChange={(e) => setLlmTemperature(parseFloat(e.target.value))}
                    disabled={isSubmitting}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-600"
                  />
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    Controls randomness (0 = deterministic, 1 = very creative). Lower values recommended for tool calling.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="tool-call-strict-mode"
                    checked={toolCallStrictMode}
                    onChange={(e) => setToolCallStrictMode(e.target.checked)}
                    disabled={isSubmitting || !strictModeSupportedModels.includes(llmModel)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <Label htmlFor="tool-call-strict-mode" className="mb-0">
                      Tool Call Strict Mode
                    </Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {strictModeSupportedModels.includes(llmModel) 
                        ? "Use structured output to ensure tool call arguments follow JSON schema (GPT-4o models only)"
                        : "Only available for GPT-4o and GPT-4o Mini models"}
                    </p>
                  </div>
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
