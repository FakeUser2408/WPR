import {
  buildWprAuditSynthesisPrompt,
  buildWprDataExtractionPrompt,
  MAX_WPR_CHARS_PER_REPORT,
} from "./wpr-analysis-prompt.ts";
import { parseJsonWithRepair } from "./json-repair.ts";

/** Claude Haiku 4.5 via OpenRouter — matches legacy audit quality. */
export const DEFAULT_OPENROUTER_MODEL = "anthropic/claude-haiku-4.5";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_TOKENS_DATA = 12000;
const MAX_TOKENS_AUDIT = 8000;
const REQUEST_TIMEOUT_MS = 100_000;

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

function getModelId(): string {
  return Deno.env.get("OPENROUTER_MODEL")?.trim() || DEFAULT_OPENROUTER_MODEL;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 503 || status === 529;
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("429") || msg.includes("503") || msg.includes("529") ||
    msg.includes("rate limit") || msg.includes("overloaded") || msg.includes("timeout") ||
    msg.includes("abort");
}

function isJsonParseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes("JSON") || error.message.includes("Unexpected");
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

interface ChatResult {
  text: string;
  truncated: boolean;
}

async function openRouterChat(
  messages: ChatMessage[],
  maxTokens: number,
): Promise<ChatResult> {
  const apiKey = getApiKey();
  const modelId = getModelId();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= 2; attempt++) {
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

      if (!response.ok) {
        const errText = await response.text();
        if (attempt < 2 && isRetryableStatus(response.status)) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
          console.log(`OpenRouter HTTP ${response.status}, retry in ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw new Error(`OpenRouter HTTP ${response.status}: ${errText.substring(0, 300)}`);
      }

      const data = await response.json() as {
        choices?: { message?: { content?: string }; finish_reason?: string }[];
        error?: { message?: string };
      };

      if (data.error?.message) throw new Error(data.error.message);

      const choice = data.choices?.[0];
      const text = choice?.message?.content?.trim();
      if (!text) throw new Error("No text in OpenRouter response");

      const truncated = choice?.finish_reason === "length";
      if (truncated) {
        console.warn("OpenRouter response truncated (max_tokens)");
      }

      return { text, truncated };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < 2 && isRetryableError(error)) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw lastError;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new Error("OpenRouter API call failed");
}

async function chatAndParseJson(
  messages: ChatMessage[],
  maxTokens: number,
  phaseLabel: string,
): Promise<Record<string, unknown>> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const msgs = attempt === 0
        ? messages
        : [...messages, { role: "user" as const, content: JSON_RETRY_HINT }];

      const { text, truncated } = await openRouterChat(msgs, maxTokens);
      return parseJsonWithRepair(text);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`${phaseLabel} attempt ${attempt + 1} failed:`, lastError.message);
      if (attempt === 1 || !isJsonParseError(error)) break;
    }
  }

  throw new Error(
    `${phaseLabel} failed: ${lastError?.message ?? "invalid JSON"}. Try analyzing again.`,
  );
}

/**
 * Two-phase analysis: (1) extract all table rows, (2) synthesize warnings/sections.
 */
export async function runFullWprAnalysis(
  sourceLabel: string,
  wpr1Text: string,
  wpr2Text: string,
): Promise<Record<string, unknown>> {
  const wpr1 = trimWprInput(wpr1Text);
  const wpr2 = trimWprInput(wpr2Text);
  const userPrompt = `---WPR 1 (Previous Week)---\n${wpr1}\n\n---WPR 2 (Current Week)---\n${wpr2}`;

  console.log(`Phase 1: data extraction (${wpr1.length + wpr2.length} chars input)`);
  const data = await chatAndParseJson(
    [
      { role: "system", content: buildWprDataExtractionPrompt(sourceLabel) },
      { role: "user", content: userPrompt },
    ],
    MAX_TOKENS_DATA,
    "Data extraction",
  );

  console.log("Phase 2: audit synthesis");
  const audit = await chatAndParseJson(
    [
      { role: "system", content: buildWprAuditSynthesisPrompt() },
      {
        role: "user",
        content: `Structured data extracted from both WPRs:\n${JSON.stringify(data)}`,
      },
    ],
    MAX_TOKENS_AUDIT,
    "Audit synthesis",
  );

  return { ...data, ...audit };
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
