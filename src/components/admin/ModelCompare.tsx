"use client";

import React, { useState, useEffect } from "react";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";

// Platform-only tool: run an IR question through a temporary per-model chat agent and compare
// responses, so the platform can validate which vendor models are the most accurate/effective
// before adding them to the curated allowlist (ALLOWED_LLM_MODELS).
export default function ModelCompare() {
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([]);
  const [tenantId, setTenantId] = useState("");
  const [question, setQuestion] = useState("What was the company's revenue in the most recent fiscal year, and where is this disclosed?");
  const [models, setModels] = useState("gpt-4.1,claude-4.5-sonnet");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Array<{ model: string; response?: string; error?: string }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/tenants");
        if (res.ok) {
          const data = await res.json();
          const list = (data.tenants || [])
            .map((t: any) => ({ id: t.tenant_id || t.tenants?.id, name: t.tenants?.name || t.name }))
            .filter((t: any) => t.id && t.name);
          setTenants(list);
          if (list.length && !tenantId) setTenantId(list[0].id);
        }
      } catch {
        /* ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runCompare(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResults([]);
    if (!tenantId) return setError("Select an organization.");
    const modelList = models.split(",").map((m) => m.trim()).filter(Boolean);
    if (!question.trim() || modelList.length === 0) return setError("Enter a question and at least one model.");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/model-compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), models: modelList, tenant_id: tenantId }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Comparison failed.");
      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message || "Comparison failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={runCompare} className="space-y-4 rounded-lg border p-5 bg-white dark:bg-gray-800 dark:border-gray-700">
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-1">Organization (for the voice-provider workspace)</label>
          <select
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select organization...</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-1">Question</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-1">
            Models (comma-separated vendor model ids)
          </label>
          <input
            value={models}
            onChange={(e) => setModels(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:bg-gray-700 dark:text-white"
            placeholder="gpt-4.1,claude-4.5-sonnet"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Temporary agents/LLMs are created and cleaned up in the selected workspace; nothing persists.
          </p>
        </div>

        {error && <Alert variant="error" title="Error" message={error} />}

        <Button type="submit" disabled={loading}>
          {loading ? "Comparing..." : "Compare models"}
        </Button>
      </form>

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((r) => (
            <div key={r.model} className="rounded-lg border p-4 bg-white dark:bg-gray-800 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{r.model}</h4>
              {r.error ? (
                <p className="text-sm text-red-600 dark:text-red-400">{r.error}</p>
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{r.response}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
