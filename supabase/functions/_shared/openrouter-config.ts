/**
 * OpenRouter model configuration — automatic free-model failover.
 *
 * Primary model:
 *   supabase secrets set OPENROUTER_MODEL=nvidia/nemotron-3-nano-30b-a3b:free
 *
 * Optional custom fallback list (comma-separated):
 *   supabase secrets set OPENROUTER_MODEL_FALLBACKS=model-a:free,model-b:free
 *
 * If OPENROUTER_MODEL_FALLBACKS is not set, all DEFAULT_FREE_MODEL_FALLBACKS are used.
 */

/** Default primary — 256K context, good for large WPR JSON extraction. */
export const DEFAULT_OPENROUTER_MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";

/**
 * Tried in order when the primary model fails (429, 502, provider down, bad JSON, etc.).
 * Ends with openrouter/free so OpenRouter picks any available free model as last resort.
 */
export const DEFAULT_FREE_MODEL_FALLBACKS = [
  "openai/gpt-oss-120b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "openai/gpt-oss-20b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "qwen/qwen3-coder-480b-a35b-instruct:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "openrouter/free",
] as const;

export const OPENROUTER_MODEL_PRESETS = {
  nemotron30bFree: "nvidia/nemotron-3-nano-30b-a3b:free",
  gptOss120bFree: "openai/gpt-oss-120b:free",
  llama3370bFree: "meta-llama/llama-3.3-70b-instruct:free",
  gptOss20bFree: "openai/gpt-oss-20b:free",
  qwen80bFree: "qwen/qwen3-next-80b-a3b-instruct:free",
  qwenCoder480bFree: "qwen/qwen3-coder-480b-a35b-instruct:free",
  nemotron9bFree: "nvidia/nemotron-nano-9b-v2:free",
  llama32_3bFree: "meta-llama/llama-3.2-3b-instruct:free",
  hermes405bFree: "nousresearch/hermes-3-llama-3.1-405b:free",
  openrouterFreeRouter: "openrouter/free",
  liquid12bFree: "liquid/lfm-2.5-1.2b-instruct:free",
  claudeHaiku: "anthropic/claude-haiku-4.5",
  deepseek: "deepseek/deepseek-v3.2",
} as const;

export function resolveOpenRouterModel(requestOverride?: string): string {
  const fromRequest = requestOverride?.trim();
  if (fromRequest) return fromRequest;

  const fromEnv = Deno.env.get("OPENROUTER_MODEL")?.trim();
  if (fromEnv) return fromEnv;

  return DEFAULT_OPENROUTER_MODEL;
}

function parseFallbackList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Full ordered list: primary → fallbacks (deduped). */
export function resolveOpenRouterModelChain(requestOverride?: string): string[] {
  const primary = resolveOpenRouterModel(requestOverride);
  const envFallbacks = parseFallbackList(Deno.env.get("OPENROUTER_MODEL_FALLBACKS"));
  const fallbacks = envFallbacks.length > 0 ? envFallbacks : [...DEFAULT_FREE_MODEL_FALLBACKS];
  const chain = [primary, ...fallbacks.filter((m) => m !== primary)];
  if (!chain.includes("openrouter/free")) {
    chain.push("openrouter/free");
  }
  return [...new Set(chain)];
}
