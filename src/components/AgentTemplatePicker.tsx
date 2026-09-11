"use client";

import React from "react";
import { Modal } from "./ui/modal";

export type TemplateId = "investor-relations";

interface TemplateDefinition {
  id: TemplateId;
  name: string;
  description: string;
  badge: string;
}

// Add new templates here as they're built - each one just needs a card definition
// plus a case in the caller's switch statement for which form component to render.
const TEMPLATES: TemplateDefinition[] = [
  {
    id: "investor-relations",
    name: "Investor Relations",
    description:
      "For public companies. Answers investor questions using only your public filings and IR website content - never fabricates, never gives investment advice, always cites sources, and hands off anything sensitive to a human.",
    badge: "Public Companies",
  },
];

interface AgentTemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateId: TemplateId) => void;
}

export default function AgentTemplatePicker({
  isOpen,
  onClose,
  onSelect,
}: AgentTemplatePickerProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Choose a Template" className="max-w-2xl">
      <div className="px-6 py-4">
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Every agent starts from a pre-configured template with the right guardrails and
          prompt for its use case. More templates will be added over time.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template.id)}
              className="flex flex-col rounded-xl border border-gray-200 p-4 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-50 dark:border-gray-700 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/20"
            >
              <span className="mb-2 inline-block w-fit rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                {template.badge}
              </span>
              <span className="mb-1 font-semibold text-gray-900 dark:text-white">
                {template.name}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {template.description}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
