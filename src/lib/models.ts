// Curated voice-provider model allowlist.
//
// The platform exposes only the models it has validated (accuracy/latency/cost) to company
// users, not the whole vendor model library. Configure via the ALLOWED_LLM_MODELS env var as a
// comma-separated list of model ids (e.g. "gpt-4.1,claude-4.5-sonnet"). An EMPTY list means
// "no allowlist configured" -> every model is allowed (used while testing to avoid locking
// people out before the comparison/validation step is done).

function allowlist(): string[] {
  return (process.env.ALLOWED_LLM_MODELS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** True if the given model is allowed by the platform allowlist. */
export function isModelAllowed(model?: string | null): boolean {
  if (!model) return true;
  const list = allowlist();
  if (list.length === 0) return true; // allowlist not configured yet -> allow all
  return list.includes(model);
}

/** The configured allowlist (empty when not configured). */
export function allowedModelIds(): string[] {
  return allowlist();
}
