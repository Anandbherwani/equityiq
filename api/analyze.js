/**
 * Vercel serverless function — AI analysis proxy via OpenRouter.
 *
 * Replaces the previous Anthropic direct call.
 * Uses free OpenRouter models with smart task-based routing.
 *
 * POST body (OpenAI-compatible):
 *   messages   array     required
 *   task       string    optional: "brief" | "scoring" | "classification"
 *   model      string    optional override
 *   max_tokens number    optional (default 1024)
 *   no_cache   boolean   optional
 */

const OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions";

const MODELS = {
  fast:      "google/gemini-2.0-flash-exp:free",
  reasoning: "deepseek/deepseek-r1:free",
  classify:  "mistralai/mistral-7b-instruct:free",
};

function modelForTask(task) {
  switch (task) {
    case "scoring":        return MODELS.reasoning;
    case "classification": return MODELS.classify;
    case "brief":
    default:               return MODELS.fast;
  }
}

// Simple in-process cache (lives for the lifetime of this Lambda container).
const cache = new Map();
const TTL_MS = 60 * 60 * 1000; // 1 hour

function cacheKey(model, messages) {
  return `${model}::${JSON.stringify(messages)}`;
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data;
}

function setCached(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + TTL_MS });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    return res.status(200).json({ ok: true, models: MODELS, cacheSize: cache.size });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ ok: false, error: "OPENROUTER_API_KEY is not configured." });
  }

  const { messages, task, model: modelOverride, max_tokens, no_cache } = req.body ?? {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ ok: false, error: "messages[] is required." });
  }

  const model = modelOverride ?? modelForTask(task);
  const key   = cacheKey(model, messages);

  if (!no_cache) {
    const hit = getCached(key);
    if (hit) return res.status(200).json({ ...hit, cached: true });
  }

  try {
    const upstream = await fetch(OPENROUTER_BASE, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer":  "https://equityiq.app",
        "X-Title":       "EquityIQ",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: max_tokens ?? 1024,
        temperature: task === "classification" ? 0 : 0.3,
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        ok: false,
        error: data?.error?.message ?? `OpenRouter returned ${upstream.status}`,
      });
    }

    const payload = { ok: true, ...data, cached: false };
    if (!no_cache) setCached(key, payload);
    return res.status(200).json(payload);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
