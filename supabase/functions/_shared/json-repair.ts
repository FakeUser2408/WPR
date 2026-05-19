/** Extract and repair model JSON (truncation, trailing commas, unclosed brackets). */

export function extractJsonBlob(text: string): string {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.indexOf("{");
  if (start === -1) throw new Error("No JSON object in response");
  const end = cleaned.lastIndexOf("}");
  if (end > start) return cleaned.substring(start, end + 1);
  return cleaned.substring(start);
}

/** Remove trailing commas invalid in strict JSON. */
export function fixTrailingCommas(json: string): string {
  let prev = "";
  let s = json;
  while (s !== prev) {
    prev = s;
    s = s.replace(/,(\s*[\]}])/g, "$1");
  }
  return s;
}

/** Close arrays/objects left open when the model hits max_tokens. */
export function closeTruncatedJson(json: string): string {
  let result = json.trim();
  result = result.replace(/,\s*$/, "");

  // Drop a trailing incomplete object inside an array (common truncation pattern)
  result = result.replace(/,(\s*\{[^}]*?)?$/, "");

  const stack: ("}" | "]")[] = [];
  let inString = false;
  let escape = false;

  for (let i = 0; i < result.length; i++) {
    const c = result[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\" && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "{") stack.push("}");
    else if (c === "[") stack.push("]");
    else if (c === "}" || c === "]") stack.pop();
  }

  if (inString) {
    result += '"';
  }

  while (stack.length > 0) {
    result += stack.pop();
  }

  return result;
}

export function parseJsonWithRepair(text: string): Record<string, unknown> {
  const blob = extractJsonBlob(text);
  const strategies = [
    () => JSON.parse(blob),
    () => JSON.parse(fixTrailingCommas(blob)),
    () => JSON.parse(fixTrailingCommas(closeTruncatedJson(blob))),
    () => JSON.parse(closeTruncatedJson(fixTrailingCommas(blob))),
  ];

  let lastError: Error | null = null;
  for (const attempt of strategies) {
    try {
      const value = attempt();
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError ?? new Error("Invalid JSON in AI response");
}
