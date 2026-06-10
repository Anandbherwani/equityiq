import { NextRequest, NextResponse } from "next/server";
import { aiComplete, modelForTask } from "@/lib/ai-client";
import type { AiTaskType } from "@/lib/ai-client";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

/**
 * POST /api/analyze
 *
 * Accepts an OpenAI-compatible chat completions request body.
 * Routes to the appropriate free OpenRouter model based on the `task` field.
 *
 * Body:
 *   messages   ChatCompletionMessageParam[]   required
 *   task       "brief" | "scoring" | "classification"   optional (default: "brief")
 *   model      string   optional override (bypasses task routing)
 *   max_tokens number   optional (default: 1024)
 *   no_cache   boolean  optional (default: false)
 */
export async function POST(req: NextRequest) {
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "OPENROUTER_API_KEY is not configured on the server." },
      { status: 503 }
    );
  }

  let body: {
    messages?: ChatCompletionMessageParam[];
    task?: AiTaskType;
    model?: string;
    max_tokens?: number;
    no_cache?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { messages, task, model, max_tokens, no_cache } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { ok: false, error: "messages[] is required and must be a non-empty array." },
      { status: 400 }
    );
  }

  try {
    const result = await aiComplete(messages, {
      task: task ?? "brief",
      model,
      maxTokens: max_tokens,
      noCache: no_cache ?? false,
    });

    return NextResponse.json({
      ok: true,
      content: result.content,
      model: result.model,
      cached: result.cached,
      // OpenAI-compatible shape so existing callers don't break
      choices: [
        {
          message: { role: "assistant", content: result.content },
          finish_reason: "stop",
          index: 0,
        },
      ],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI request failed";
    const status = msg.includes("401") ? 401 : msg.includes("429") ? 429 : 502;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

/** Return routing info and cache stats without making an AI call. */
export async function GET() {
  const { getAiCacheSize, pruneAiCache, AI_MODELS } = await import("@/lib/ai-client");
  const pruned = pruneAiCache();
  return NextResponse.json({
    ok: true,
    models: AI_MODELS,
    routing: {
      brief: modelForTask("brief"),
      scoring: modelForTask("scoring"),
      classification: modelForTask("classification"),
    },
    cache: { size: getAiCacheSize(), pruned },
  });
}
