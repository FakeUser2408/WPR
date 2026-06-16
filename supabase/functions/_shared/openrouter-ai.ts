import {
  buildWprAuditSynthesisPrompt,
  buildWprDataExtractionPrompt,
  MAX_WPR_CHARS_PER_REPORT,
} from "./wpr-analysis-prompt.ts";
import { parseJsonWithRepair } from "./json-repair.ts";
import { normalizeWprAnalysis } from "./wpr-response-normalizer.ts";
import {
  formatValidationFeedback,
  validateWprAudit,
  validateWprExtraction,
} from "./wpr-analysis-validator.ts";
import { resolveOpenRouterModelChain } from "./openrouter-config.ts";

export {
  DEFAULT_OPENROUTER_MODEL,
  DEFAULT_FREE_MODEL_FALLBACKS,
  OPENROUTER_MODEL_PRESETS,
  resolveOpenRouterModel,
  resolveOpenRouterModelChain,
} from "./openrouter-config.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_TOKENS_DATA = 12000;
const MAX_TOKENS_AUDIT = 8000;
const REQUEST_TIMEOUT_MS = 100_000;
const RETRIES_PER_MODEL = 1;

const JSON_RETRY_HINT =
  "Your last reply was not valid JSON (truncated or trailing comma). Return ONLY one complete JSON object. No markdown. Close every array and object. Keep each progress \"reason\" under 100 characters but include every row.";

export function trimWprInput(text: string): string {
  const t = text.trim();
  if (t.length <= MAX_WPR_CHARS_PER_REPORT) return t;
  return t.substring(0, MAX_WPR_CHARS_PER_REPORT);
}

function getApiKey(): string {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");
  return apiKey;
}

function formatOpenRouterError(status: number, errText: string, modelId: string): string {
  if (status === 402) {
    return (
      `OpenRouter account has insufficient credits (model: ${modelId}). ` +
      `Add balance at https://openrouter.ai/settings/credits.`
    );
  }
  if (status === 401) {
    return `OpenRouter API key is invalid. Check OPENROUTER_API_KEY in Supabase secrets.`;
  }
  return `OpenRouter HTTP ${status} (model: ${modelId}): ${errText.substring(0, 300)}`;
}

/** Switch to the next free model — do not retry billing/auth errors across models. */
function shouldSwitchModel(status: number, errText: string, message = ""): boolean {
  if (status === 401 || status === 402 || status === 400) return false;

  const combined = `${errText} ${message}`.toLowerCase();
  if (status === 429 || status === 502 || status === 503 || status === 529) return true;

  return (
    combined.includes("rate-limit") ||
    combined.includes("rate limit") ||
    combined.includes("rate_limited") ||
    combined.includes("provider returned error") ||
    combined.includes("temporarily") ||
    combined.includes("overloaded") ||
    combined.includes("unavailable") ||
    combined.includes("no text in openrouter") ||
    combined.includes("timeout") ||
    combined.includes("abort") ||
    combined.includes("invalid json") ||
    combined.includes("unexpected token")
  );
}

function isTransientStatus(status: number): boolean {
  return status === 503 || status === 529;
}

function isJsonParseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("json") || msg.includes("unexpected token") || msg.includes("truncated");
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

interface ChatResult {
  text: string;
  truncated: boolean;
  modelId: string;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchChatCompletion(
  apiKey: string,
  modelId: string,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<ChatResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://wpr-audit.app",
        "X-Title": "WPR Audit",
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: maxTokens,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages,
      }),
    });

    const errText = response.ok ? "" : await response.text();

    if (!response.ok) {
      const err = new Error(formatOpenRouterError(response.status, errText, modelId));
      (err as Error & { status?: number; errText?: string }).status = response.status;
      (err as Error & { status?: number; errText?: string }).errText = errText;
      throw err;
    }

    const data = await response.json() as {
      choices?: { message?: { content?: string }; finish_reason?: string }[];
      error?: { message?: string };
    };

    if (data.error?.message) {
      const err = new Error(data.error.message);
      (err as Error & { errText?: string }).errText = data.error.message;
      throw err;
    }

    const choice = data.choices?.[0];
    const text = choice?.message?.content?.trim();
    if (!text) {
      const err = new Error("No text in OpenRouter response");
      (err as Error & { errText?: string }).errText = "empty response";
      throw err;
    }

    const truncated = choice?.finish_reason === "length";
    if (truncated) {
      console.warn(`OpenRouter response truncated (max_tokens) on ${modelId}`);
    }

    return { text, truncated, modelId };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      const err = new Error(`Request timeout on ${modelId}`);
      (err as Error & { errText?: string }).errText = "timeout";
      throw err;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function getErrorMeta(error: unknown): { status: number; errText: string; message: string } {
  if (!(error instanceof Error)) {
    return { status: 0, errText: "", message: String(error) };
  }
  const e = error as Error & { status?: number; errText?: string };
  return {
    status: e.status ?? 0,
    errText: e.errText ?? "",
    message: e.message,
  };
}

/**
 * Try every model in the chain until one returns valid text.
 * Switches model on rate limits, provider errors, downtime, timeouts, empty responses.
 */
async function chatWithModelFailover(
  messages: ChatMessage[],
  maxTokens: number,
  modelOverride?: string,
): Promise<ChatResult> {
  const apiKey = getApiKey();
  const modelChain = resolveOpenRouterModelChain(modelOverride);
  let lastError: Error | null = null;

  console.log(`OpenRouter failover chain (${modelChain.length} models): ${modelChain.join(" → ")}`);

  for (let modelIndex = 0; modelIndex < modelChain.length; modelIndex++) {
    const modelId = modelChain[modelIndex]!;
    const hasNext = modelIndex < modelChain.length - 1;

    if (modelIndex === 0) {
      console.log(`Trying model: ${modelId}`);
    } else {
      console.log(`Switching to fallback model: ${modelId}`);
    }

    for (let attempt = 0; attempt <= RETRIES_PER_MODEL; attempt++) {
      try {
        return await fetchChatCompletion(apiKey, modelId, messages, maxTokens);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const { status, errText, message } = getErrorMeta(error);

        if (status === 401 || status === 402) throw lastError;

        if (hasNext && shouldSwitchModel(status, errText, message)) {
          console.warn(`Model ${modelId} failed (${message.substring(0, 120)}), trying next free model`);
          break;
        }

        if (attempt < RETRIES_PER_MODEL && (isTransientStatus(status) || message.includes("timeout"))) {
          const delay = 2000 * (attempt + 1);
          console.log(`Transient error on ${modelId}, retry in ${delay}ms`);
          await sleep(delay);
          continue;
        }

        if (hasNext) {
          console.warn(`Model ${modelId} failed, trying next free model`);
          break;
        }

        throw lastError;
      }
    }
  }

  throw new Error(
    `All ${modelChain.length} OpenRouter models failed. Last error: ${lastError?.message ?? "unknown"}. ` +
    `Tried: ${modelChain.join(" → ")}`,
  );
}

async function chatAndParseJson(
  messages: ChatMessage[],
  maxTokens: number,
  phaseLabel: string,
  modelOverride?: string,
): Promise<Record<string, unknown>> {
  const modelChain = resolveOpenRouterModelChain(modelOverride);
  let lastError: Error | null = null;

  for (let modelIndex = 0; modelIndex < modelChain.length; modelIndex++) {
    const modelId = modelChain[modelIndex]!;
    const hasNextModel = modelIndex < modelChain.length - 1;

    for (let jsonAttempt = 0; jsonAttempt <= 1; jsonAttempt++) {
      try {
        const msgs = jsonAttempt === 0
          ? messages
          : [...messages, { role: "user" as const, content: JSON_RETRY_HINT }];

        const apiKey = getApiKey();
        let result: ChatResult | null = null;

        for (let attempt = 0; attempt <= RETRIES_PER_MODEL; attempt++) {
          try {
            result = await fetchChatCompletion(apiKey, modelId, msgs, maxTokens);
            break;
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            const { status, errText, message } = getErrorMeta(error);
            if (status === 401 || status === 402) throw lastError;
            if (hasNextModel && shouldSwitchModel(status, errText, message)) break;
            if (attempt < RETRIES_PER_MODEL && isTransientStatus(status)) {
              await sleep(2000 * (attempt + 1));
              continue;
            }
            if (hasNextModel) break;
            throw lastError;
          }
        }

        if (!result) continue;

        console.log(`${phaseLabel}: succeeded with ${result.modelId}`);
        return parseJsonWithRepair(result.text);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const { status, errText, message } = getErrorMeta(error);

        if (status === 401 || status === 402) throw lastError;

        const jsonFail = isJsonParseError(error);
        console.warn(
          `${phaseLabel} failed on ${modelId} (json attempt ${jsonAttempt + 1}):`,
          lastError.message.substring(0, 160),
        );

        if (jsonFail && jsonAttempt === 0) continue;

        if (hasNextModel && (shouldSwitchModel(status, errText, message) || jsonFail)) {
          console.warn(`${phaseLabel}: switching to next free model`);
          break;
        }

        if (!hasNextModel) break;
      }
    }
  }

  throw new Error(
    `${phaseLabel} failed after trying all free models. ${lastError?.message ?? "invalid JSON"}`,
  );
}

async function chatAndParseJsonValidated(
  messages: ChatMessage[],
  maxTokens: number,
  phaseLabel: string,
  modelOverride: string | undefined,
  validate: (parsed: Record<string, unknown>) => ReturnType<typeof validateWprExtraction>,
): Promise<Record<string, unknown>> {
  let msgs = messages;
  let lastIssues: ReturnType<typeof validateWprExtraction> = [];

  for (let validationAttempt = 0; validationAttempt <= 1; validationAttempt++) {
    const parsed = await chatAndParseJson(msgs, maxTokens, phaseLabel, modelOverride);
    const issues = validate(parsed);
    if (issues.length === 0) return parsed;

    lastIssues = issues;
    console.warn(
      `${phaseLabel} validation failed (attempt ${validationAttempt + 1}):`,
      issues.map((i) => i.field).join(", "),
    );

    if (validationAttempt === 1) {
      console.warn(`${phaseLabel}: returning best-effort output after validation retries`);
      return parsed;
    }

    msgs = [
      ...messages,
      { role: "user" as const, content: formatValidationFeedback(phaseLabel, issues) },
    ];
  }

  throw new Error(`${phaseLabel} validation failed: ${lastIssues.map((i) => i.message).join("; ")}`);
}

export interface WprAnalysisOptions {
  model?: string;
}

export async function runFullWprAnalysis(
  sourceLabel: string,
  wpr1Text: string,
  wpr2Text: string,
  options?: WprAnalysisOptions,
): Promise<Record<string, unknown>> {
  const wpr1 = trimWprInput(wpr1Text);
  const wpr2 = trimWprInput(wpr2Text);
  const userPrompt = `---WPR 1 (Previous Week)---\n${wpr1}\n\n---WPR 2 (Current Week)---\n${wpr2}`;

  console.log(`Phase 1: data extraction (${wpr1.length + wpr2.length} chars input)`);
  const data = await chatAndParseJsonValidated(
    [
      { role: "system", content: buildWprDataExtractionPrompt(sourceLabel) },
      { role: "user", content: userPrompt },
    ],
    MAX_TOKENS_DATA,
    "Data extraction",
    options?.model,
    validateWprExtraction,
  );

  console.log("Phase 2: audit synthesis");
  const audit = await chatAndParseJsonValidated(
    [
      { role: "system", content: buildWprAuditSynthesisPrompt() },
      {
        role: "user",
        content: `Structured data extracted from both WPRs:\n${JSON.stringify(data)}`,
      },
    ],
    MAX_TOKENS_AUDIT,
    "Audit synthesis",
    options?.model,
    (parsed) => validateWprAudit(parsed, data),
  );

  return normalizeWprAnalysis({ ...data, ...audit });
}

/** @deprecated Use runFullWprAnalysis */
export async function generateWprAnalysisText(
  _systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const wpr1Match = userPrompt.match(/---WPR 1 \(Previous Week\)---\n([\s\S]*?)\n\n---WPR 2/);
  const wpr2Match = userPrompt.match(/---WPR 2 \(Current Week\)---\n([\s\S]*)$/);
  const wpr1 = wpr1Match?.[1] ?? userPrompt;
  const wpr2 = wpr2Match?.[1] ?? "";
  const result = await runFullWprAnalysis("WPR text", wpr1, wpr2);
  return JSON.stringify(result);
}

export function parseAnalysisJson(text: string): Record<string, unknown> {
  return parseJsonWithRepair(text);
}

// Exported for tests / direct chat without JSON parsing
export { chatWithModelFailover };
