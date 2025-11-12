"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { searchNavItems, getAllNavItems } from "@/config/navigation";
import { Modal } from "../ui/modal";
import Input from "../form/input/InputField";
import Badge from "../ui/badge/Badge";

interface NavigationSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const categoryLabels: Record<string, string> = {
  dashboard: "Dashboard",
  admin: "Admin",
  settings: "Settings",
  templates: "Templates",
};

export default function NavigationSearch({
  isOpen,
  onClose,
}: NavigationSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const results = query.trim()
    ? searchNavItems(query)
    : getAllNavItems().slice(0, 10); // Show recent/popular items when no query

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex].path);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const handleSelect = (path: string) => {
    router.push(path);
    onClose();
    setQuery("");
  };

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Search Pages
        </h3>
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search pages by name, path, or description..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="mb-4"
        />

        <div
          ref={resultsRef}
          className="max-h-96 overflow-y-auto space-y-1"
        >
          {results.length === 0 ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              <p>No results found for "{query}"</p>
            </div>
          ) : (
            results.map((item, index) => (
              <button
                key={`${item.path}-${index}`}
                onClick={() => handleSelect(item.path)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  index === selectedIndex
                    ? "bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-800"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {item.name}
                      </span>
                      <Badge
                        size="sm"
                        color={
                          item.type === "functional" ? "success" : "warning"
                        }
                        variant="light"
                      >
                        {item.type === "functional" ? "Live" : "Demo"}
                      </Badge>
                      <Badge
                        size="sm"
                        color="info"
                        variant="light"
                      >
                        {categoryLabels[item.category]}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {item.path}
                    </p>
                    {item.description && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                  {item.badge && (
                    <Badge
                      size="sm"
                      color={
                        item.badge === "new"
                          ? "primary"
                          : item.badge === "pro"
                          ? "info"
                          : "warning"
                      }
                      variant="light"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
          <p>Use ↑↓ to navigate, Enter to select, Esc to close</p>
        </div>
      </div>
    </Modal>
  );
}

