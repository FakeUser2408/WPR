import { GoogleGenerativeAI, type Part } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("VITE_GEMINI_API_KEY is not set in .env");
}

const genAI = new GoogleGenerativeAI(API_KEY || "");

/**
 * Call Gemini with a text-only prompt. Returns parsed JSON.
 */
export async function callGeminiText(prompt: string): Promise<any> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 16384,
      responseMimeType: "application/json",
    },
  });

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return JSON.parse(cleaned);
    } catch (err: any) {
      lastError = err;
      const isRetryable =
        err.message?.includes("503") ||
        err.message?.includes("429") ||
        err.message?.includes("overloaded") ||
        err.message?.includes("RESOURCE_EXHAUSTED");

      if (!isRetryable || attempt === maxRetries) break;

      const delay = Math.min(1000 * Math.pow(2, attempt), 8000) + Math.random() * 1000;
      console.log(`Gemini returned error, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError || new Error("Gemini API call failed");
}

/**
 * Call Gemini with multimodal content (text + images). Returns parsed JSON.
 */
export async function callGeminiMultimodal(parts: Part[]): Promise<any> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(parts);
      const text = result.response.text();
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return JSON.parse(cleaned);
    } catch (err: any) {
      lastError = err;
      const isRetryable =
        err.message?.includes("503") ||
        err.message?.includes("429") ||
        err.message?.includes("overloaded") ||
        err.message?.includes("RESOURCE_EXHAUSTED");

      if (!isRetryable || attempt === maxRetries) break;

      const delay = Math.min(1000 * Math.pow(2, attempt), 8000) + Math.random() * 1000;
      console.log(`Gemini vision returned error, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError || new Error("Gemini multimodal API call failed");
}

/**
 * Convert a Blob to a Gemini-compatible inline data part.
 */
export async function blobToInlinePart(blob: Blob, mimeType = "image/jpeg"): Promise<Part> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return {
    inlineData: {
      mimeType,
      data: base64,
    },
  };
}
