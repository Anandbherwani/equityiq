import { NextRequest, NextResponse } from "next/server";
import { aiComplete, getAiCacheSize, pruneAiCache, AI_MODELS } from "@/lib/ai-client";
import type { AiMessage, AiTaskType, StockMetrics } from "@/lib/ai-client";

/**
 * POST /api/analyze
 *
 * Zero-key-required AI analysis. Provider waterfall:
 *   Pollinations (no key) → Groq → Gemini → OpenRouter → rule-based fallback
 *
 * The endpoint always returns a 200 with content — it never errors due to
 * missing API keys.
 *
 * Body:
 *   messages    AiMessage[]    required
 *   task        AiTaskType     optional (default: "brief")
 *   max_tokens  number         optional (default: 512)
 *   no_cache    boolean        optional (default: false)
 *   symbol      string         optional — used as cache key prefix
 *   metrics     StockMetrics   optional — used by rule-based fallback
 */
export async function POST(req: NextRequest) {
  let body: {
    messages?: AiMessage[];
    task?: AiTaskType;
    max_tokens?: number;
    no_cache?: boolean;
    symbol?: string;
    metrics?: StockMetrics;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { messages, task, max_tokens, no_cache, symbol, metrics } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { ok: false, error: "messages[] is required and must be a non-empty array." },
      { status: 400 }
    );
  }

  // Never throw for missing keys — the waterfall handles it
  const result = await aiComplete(
    messages,
    { task: task ?? "brief", maxTokens: max_tokens, noCache: no_cache ?? false, symbol },
    metrics ? { ...metrics, symbol } : undefined
  );

  return NextResponse.json({
    ok: true,
    content: result.content,
    model: result.model,
    provider: result.provider,
    cached: result.cached,
    // OpenAI-compatible shape for callers expecting choices[]
    choices: [
      {
        message: { role: "assistant", content: result.content },
        finish_reason: "stop",
        index: 0,
      },
    ],
  });
}

/** GET /api/analyze — provider config + cache stats (no AI call made). */
export async function GET() {
  const pruned = pruneAiCache();
  return NextResponse.json({
    ok: true,
    note: "No API key required. Pollinations AI is the default (no signup needed).",
    providers: {
      pollinations: { keyRequired: false, url: "https://text.pollinations.ai/" },
      groq:         { keyRequired: false, envVar: "GROQ_API_KEY", free: "14,400 req/day" },
      gemini:       { keyRequired: false, envVar: "GEMINI_API_KEY", free: "1,500 req/day" },
      openrouter:   { keyRequired: false, envVar: "OPENROUTER_API_KEY", free: "free models" },
      ollama:       { keyRequired: false, url: "http://localhost:11434", local: true },
      ruleBased:    { keyRequired: false, network: false, always: true },
    },
    models: AI_MODELS,
    cache: { size: getAiCacheSize(), pruned },
  });
}
