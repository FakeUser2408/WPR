import {
  buildWprAuditSynthesisPrompt,
  buildWprDataExtractionPrompt,
  MAX_WPR_CHARS_PER_REPORT,
} from "./wpr-analysis-prompt.ts";

/** Claude Haiku 4.5 via OpenRouter — matches legacy audit quality. */
export const DEFAULT_OPENROUTER_MODEL = "anthropic/claude-haiku-4.5";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
/** Per-call cap — keeps each edge invocation under Supabase CPU/memory limits. */
const MAX_TOKENS_DATA = 10000;
const MAX_TOKENS_AUDIT = 7000;
const REQUEST_TIMEOUT_MS = 100_000;

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

type ChatMessage = { role: "system" | "user"; content: string };

async function openRouterChat(
  messages: ChatMessage[],
  maxTokens: number,
): Promise<string> {
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
          temperature: 0.15,
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

      if (choice?.finish_reason === "length") {
        console.warn("OpenRouter response truncated (max_tokens)");
      }

      return text;
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

export function parseAnalysisJson(text: string): Record<string, unknown> {
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const s = text.indexOf("{");
    const e = text.lastIndexOf("}");
    if (s === -1 || e === -1) throw new Error("No JSON in response");
    return JSON.parse(text.substring(s, e + 1)) as Record<string, unknown>;
  }
}

/**
 * Two-phase analysis: (1) extract all table rows, (2) synthesize warnings/sections.
 * Uses lightweight fetch (no Vercel AI SDK) to avoid WORKER_RESOURCE_LIMIT on Supabase.
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
  const dataRaw = await openRouterChat(
    [
      { role: "system", content: buildWprDataExtractionPrompt(sourceLabel) },
      { role: "user", content: userPrompt },
    ],
    MAX_TOKENS_DATA,
  );
  const data = parseAnalysisJson(dataRaw);

  console.log("Phase 2: audit synthesis");
  const auditRaw = await openRouterChat(
    [
      { role: "system", content: buildWprAuditSynthesisPrompt() },
      {
        role: "user",
        content: `Structured data extracted from both WPRs:\n${JSON.stringify(data)}`,
      },
    ],
    MAX_TOKENS_AUDIT,
  );
  const audit = parseAnalysisJson(auditRaw);

  return { ...data, ...audit };
}

/** @deprecated Use runFullWprAnalysis — kept for compatibility */
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
