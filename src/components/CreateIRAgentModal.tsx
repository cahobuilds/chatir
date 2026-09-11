"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "./ui/modal";
import Form from "./form/Form";
import Label from "./form/Label";
import Input from "./form/input/InputField";
import Select from "./form/Select";
import Button from "./ui/button/Button";
import Alert from "./ui/alert/Alert";
import { useOrganization } from "@/context/OrganizationContext";

interface KnowledgeBaseOption {
  id: string;
  name: string;
  type: string;
}

interface VoiceOption {
  value: string;
  label: string;
}

interface CreateIRAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultChannel: "chat" | "voice"; // which checkbox starts checked
}

/**
 * One-click "Investor Relations" agent template: creates a chat agent and/or a
 * voice agent pre-configured with the restrictive IR prompt, guardrails, and knowledge
 * base defaults from docs/RETELL_IR_AGENT_TEMPLATE.md, via /api/agents/create-ir-template.
 */
export default function CreateIRAgentModal({
  isOpen,
  onClose,
  onSuccess,
  defaultChannel,
}: CreateIRAgentModalProps) {
  const { currentOrganization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [tickerSymbol, setTickerSymbol] = useState("");
  const [exchange, setExchange] = useState("NASDAQ");
  const [humanContact, setHumanContact] = useState("");
  const [createChat, setCreateChat] = useState(defaultChannel === "chat");
  const [createVoice, setCreateVoice] = useState(defaultChannel === "voice");
  const [voiceId, setVoiceId] = useState("");
  const [selectedKbIds, setSelectedKbIds] = useState<string[]>([]);

  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseOption[]>([]);
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    if (isOpen && currentOrganization?.id) {
      const fetchOptions = async () => {
        setLoadingOptions(true);
        try {
          const [kbResponse, voicesResponse] = await Promise.all([
            fetch("/api/knowledge-bases"),
            fetch(`/api/retell/voices?tenant_id=${currentOrganization.id}`),
          ]);

          if (kbResponse.ok) {
            const data = await kbResponse.json();
            setKnowledgeBases(
              (data.knowledge_bases || []).map((kb: any) => ({ id: kb.id, name: kb.name, type: kb.type }))
            );
          }

          if (voicesResponse.ok) {
            const data = await voicesResponse.json();
            const options = (data.voices || []).map((voice: any) => ({
              value: voice.voice_id,
              label: `${voice.voice_name || voice.voice_id} (${voice.provider || 'unknown'})`,
            }));
            setVoiceOptions(options);
            if (options.length > 0 && !voiceId) {
              setVoiceId(options[0].value);
            }
          }
        } catch (err) {
          console.warn("Failed to load IR template options:", err);
        } finally {
          setLoadingOptions(false);
        }
      };
      fetchOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentOrganization?.id]);

  const toggleKb = (kbId: string) => {
    setSelectedKbIds((prev) => (prev.includes(kbId) ? prev.filter((id) => id !== kbId) : [...prev, kbId]));
  };

  const resetForm = () => {
    setCompanyName("");
    setTickerSymbol("");
    setExchange("NASDAQ");
    setHumanContact("");
    setCreateChat(defaultChannel === "chat");
    setCreateVoice(defaultChannel === "voice");
    setSelectedKbIds([]);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentOrganization?.id) {
      setError("No organization selected. Please select an organization first.");
      return;
    }
    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }
    if (!createChat && !createVoice) {
      setError("Please select at least one channel to create (chat and/or voice).");
      return;
    }
    if (createVoice && !voiceId) {
      setError("Please select a voice, or turn off the voice agent option.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/agents/create-ir-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: currentOrganization.id,
          company_name: companyName.trim(),
          ticker_symbol: tickerSymbol.trim() || undefined,
          exchange: exchange || undefined,
          human_contact: humanContact.trim() || undefined,
          create_chat: createChat,
          create_voice: createVoice,
          voice_id: createVoice ? voiceId : undefined,
          knowledge_base_ids: selectedKbIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create Investor Relations agent template");
        return;
      }

      const createdBoth = Boolean(data.chat_agent) && Boolean(data.voice_agent);
      const createdChat = Boolean(data.chat_agent);
      const createdVoice = Boolean(data.voice_agent);
      const defaultMessage = createdBoth
        ? `Created Investor Relations chat and voice agents for ${companyName.trim()}. Publish each when ready to go live.`
        : createdChat
          ? `Created Investor Relations chat agent for ${companyName.trim()}. Publish it when ready to go live.`
          : createdVoice
            ? `Created Investor Relations voice agent for ${companyName.trim()}. Publish it when ready to go live.`
            : "Investor Relations agent template created successfully!";

      setSuccess(data.message || defaultMessage);
      setTimeout(() => {
        resetForm();
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Failed to create IR agent template:", err);
      setError(err.message || "Failed to create Investor Relations agent template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    !isSubmitting &&
    Boolean(companyName.trim()) &&
    (createChat || createVoice) &&
    !(createVoice && !voiceId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Create Investor Relations Agent"
    >
      <div className="px-6 py-4">
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Creates a chat agent and/or a matching voice agent pre-configured with a
          restrictive investor-relations prompt, safety guardrails, and knowledge-base
          grounding defaults.
        </p>

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

        <Form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ir-company-name">Company Name</Label>
              <Input
                id="ir-company-name"
                type="text"
                placeholder="Acme Corp"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ir-ticker">Ticker Symbol</Label>
                <Input
                  id="ir-ticker"
                  type="text"
                  placeholder="ACME"
                  value={tickerSymbol}
                  onChange={(e) => setTickerSymbol(e.target.value.toUpperCase())}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="ir-exchange">Exchange</Label>
                <Select
                  id="ir-exchange"
                  value={exchange}
                  onChange={(value) => setExchange(value)}
                  disabled={isSubmitting}
                  options={[
                    { value: "NASDAQ", label: "NASDAQ" },
                    { value: "NYSE", label: "NYSE" },
                    { value: "OTC Markets", label: "OTC Markets" },
                    { value: "TSX", label: "TSX" },
                    { value: "Other", label: "Other" },
                  ]}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="ir-human-contact">Human Contact (optional)</Label>
              <Input
                id="ir-human-contact"
                type="text"
                placeholder="investors@acmecorp.com"
                value={humanContact}
                onChange={(e) => setHumanContact(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Shown to the agent so it can redirect complex or out-of-scope questions here.
              </p>
            </div>

            <div>
              <Label>Knowledge Bases</Label>
              <p className="mt-1 mb-2 text-xs text-gray-500 dark:text-gray-400">
                Attach the company&apos;s filings/website knowledge base(s) now, or skip and attach
                later from the agent&apos;s Knowledge Base tab.
              </p>
              {loadingOptions ? (
                <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                  Loading knowledge bases...
                </div>
              ) : knowledgeBases.length === 0 ? (
                <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                  No knowledge bases yet. You can create one and attach it after.
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-3">
                  {knowledgeBases.map((kb) => (
                    <div key={kb.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`ir-kb-${kb.id}`}
                        checked={selectedKbIds.includes(kb.id)}
                        onChange={() => toggleKb(kb.id)}
                        disabled={isSubmitting}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <Label htmlFor={`ir-kb-${kb.id}`} className="mb-0">
                        {kb.name} <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">({kb.type})</span>
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ir-create-chat"
                checked={createChat}
                onChange={(e) => setCreateChat(e.target.checked)}
                disabled={isSubmitting}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <Label htmlFor="ir-create-chat" className="mb-0">
                Create chat agent (for web chat widget)
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ir-create-voice"
                checked={createVoice}
                onChange={(e) => setCreateVoice(e.target.checked)}
                disabled={isSubmitting}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <Label htmlFor="ir-create-voice" className="mb-0">
                Create voice agent (for inbound phone calls)
              </Label>
            </div>

            {createVoice && (
              <div>
                <Label htmlFor="ir-voice-id">Voice</Label>
                {loadingOptions ? (
                  <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                    Loading voices...
                  </div>
                ) : voiceOptions.length === 0 ? (
                  <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                    No voices available. Please ensure AI Assistant is connected.
                  </div>
                ) : (
                  <Select
                    id="ir-voice-id"
                    value={voiceId}
                    onChange={(value) => setVoiceId(value)}
                    disabled={isSubmitting}
                    options={voiceOptions}
                  />
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!canSubmit}>
                {isSubmitting ? "Creating..." : "Create IR Agent(s)"}
              </Button>
            </div>
          </div>
        </Form>
      </div>
    </Modal>
  );
}
