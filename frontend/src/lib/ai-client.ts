/**
 * OpenRouter AI client for EquityIQ.
 *
 * Uses the OpenAI SDK with OpenRouter as the base URL — fully API-compatible.
 * All models used here are free-tier on OpenRouter.
 *
 * Model routing:
 *   brief/summary   → google/gemini-2.0-flash-exp:free  (1M context, fast)
 *   scoring/reason  → deepseek/deepseek-r1:free          (strong reasoning)
 *   classification  → mistralai/mistral-7b-instruct:free (cheap + fast)
 */

import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// ─── Models ──────────────────────────────────────────────────────────────────

export const AI_MODELS = {
  fast: "google/gemini-2.0-flash-exp:free",
  reasoning: "deepseek/deepseek-r1:free",
  classify: "mistralai/mistral-7b-instruct:free",
} as const;

export type AiTaskType = "brief" | "scoring" | "classification";

export function modelForTask(task: AiTaskType): string {
  switch (task) {
    case "brief":          return AI_MODELS.fast;
    case "scoring":        return AI_MODELS.reasoning;
    case "classification": return AI_MODELS.classify;
  }
}

// ─── Client ──────────────────────────────────────────────────────────────────

function createClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set. Add it to .env.local.");
  }
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: {
      "HTTP-Referer": "https://equityiq.app",
      "X-Title": "EquityIQ",
    },
  });
}

// Lazily instantiated — only constructed when an AI call is actually made.
let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) _client = createClient();
  return _client;
}

// ─── In-memory cache (1-hour TTL) ────────────────────────────────────────────

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

type CacheEntry = {
  content: string;
  model: string;
  expiresAt: number;
};

// Module-level Map — shared across requests in the same Node.js process.
const responseCache = new Map<string, CacheEntry>();

function makeCacheKey(model: string, messages: ChatCompletionMessageParam[]): string {
  // Stable key: model + serialised messages (input only, not timestamps).
  return `${model}::${JSON.stringify(messages)}`;
}

function getCached(key: string): CacheEntry | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return entry;
}

function setCached(key: string, content: string, model: string): void {
  responseCache.set(key, { content, model, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Evict all expired entries (call occasionally to prevent unbounded growth). */
export function pruneAiCache(): number {
  const now = Date.now();
  let pruned = 0;
  for (const [key, entry] of responseCache) {
    if (now > entry.expiresAt) {
      responseCache.delete(key);
      pruned++;
    }
  }
  return pruned;
}

export function getAiCacheSize(): number {
  return responseCache.size;
}

// ─── Core completion function ─────────────────────────────────────────────────

export type AiCompletionOptions = {
  task?: AiTaskType;
  /** Override model — bypasses task routing. */
  model?: string;
  /** Max tokens to generate. Default 1024. */
  maxTokens?: number;
  /** Temperature. Default 0.3 for determinism. */
  temperature?: number;
  /** Skip cache lookup and write (for fresh requests). Default false. */
  noCache?: boolean;
};

export type AiCompletionResult = {
  content: string;
  model: string;
  /** Whether the response came from the in-process cache. */
  cached: boolean;
};

/**
 * Complete a chat prompt via OpenRouter.
 *
 * Returns cached response if the same model+messages were requested within 1 hour.
 */
export async function aiComplete(
  messages: ChatCompletionMessageParam[],
  options: AiCompletionOptions = {}
): Promise<AiCompletionResult> {
  const model = options.model ?? modelForTask(options.task ?? "brief");
  const cacheKey = makeCacheKey(model, messages);

  // Cache read
  if (!options.noCache) {
    const cached = getCached(cacheKey);
    if (cached) {
      return { content: cached.content, model: cached.model, cached: true };
    }
  }

  const client = getClient();
  const completion = await client.chat.completions.create({
    model,
    messages,
    max_tokens: options.maxTokens ?? 1024,
    temperature: options.temperature ?? 0.3,
  });

  const content = completion.choices[0]?.message?.content ?? "";
  const usedModel = completion.model ?? model;

  // Cache write
  if (!options.noCache) {
    setCached(cacheKey, content, usedModel);
  }

  return { content, model: usedModel, cached: false };
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

/** Generate a stock brief/summary (cached 1 h, fast model). */
export async function generateStockBrief(
  symbol: string,
  context: string,
  noCache = false
): Promise<AiCompletionResult> {
  return aiComplete(
    [
      {
        role: "system",
        content:
          "You are a concise Indian equity research analyst. Respond in 3–4 sentences maximum. Focus on the investment thesis and key risk.",
      },
      {
        role: "user",
        content: `Write a brief investment summary for ${symbol}. Context: ${context}`,
      },
    ],
    { task: "brief", maxTokens: 256, noCache }
  );
}

/** Explain a conviction score breakdown (cached 1 h, reasoning model). */
export async function explainScore(
  symbol: string,
  scoreBreakdown: Record<string, number>,
  noCache = false
): Promise<AiCompletionResult> {
  const breakdown = Object.entries(scoreBreakdown)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  return aiComplete(
    [
      {
        role: "system",
        content:
          "You are a quantitative equity analyst. Explain score components in 2–3 sentences. Be precise and data-driven.",
      },
      {
        role: "user",
        content: `Explain the conviction score for ${symbol}. Components: ${breakdown}. What drives the score and what is the main weakness?`,
      },
    ],
    { task: "scoring", maxTokens: 256, noCache }
  );
}

/** Classify a stock action as BUY / WATCH / AVOID (cached 1 h, cheap model). */
export async function classifyAction(
  conviction: number,
  confidence: number,
  riskGrade: string,
  noCache = false
): Promise<"BUY" | "WATCH" | "AVOID"> {
  const result = await aiComplete(
    [
      {
        role: "system",
        content:
          "You classify stocks. Respond with exactly one word: BUY, WATCH, or AVOID. Nothing else.",
      },
      {
        role: "user",
        content: `Conviction: ${conviction}/100. Confidence: ${confidence}%. Risk grade: ${riskGrade}. Classify.`,
      },
    ],
    { task: "classification", maxTokens: 5, temperature: 0, noCache }
  );
  const word = result.content.trim().toUpperCase();
  if (word === "BUY" || word === "WATCH" || word === "AVOID") return word;
  // Fallback to rule-based if model returns unexpected output
  if (conviction >= 65) return "BUY";
  if (conviction >= 40) return "WATCH";
  return "AVOID";
}
