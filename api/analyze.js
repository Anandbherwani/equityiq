/**
 * Vercel serverless — zero-key-required AI analysis proxy.
 *
 * Provider waterfall (tried in order):
 *   1. Pollinations AI  — no key, no signup
 *   2. Groq             — if GROQ_API_KEY set
 *   3. Gemini           — if GEMINI_API_KEY set
 *   4. OpenRouter       — if OPENROUTER_API_KEY set
 *   5. Rule-based JS    — always works, zero network
 *
 * Never returns 503 for missing keys.
 */

const TIMEOUT_MS = 8_000;

// ─── Cache (2 h TTL) ──────────────────────────────────────────────────────────

const cache = new Map();
const TTL_MS = 2 * 60 * 60 * 1000;

function todayStr() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}
function cacheKey(messages, symbol) {
  if (symbol) return `${String(symbol).toUpperCase()}-${todayStr()}`;
  return messages.map((m) => `${m.role}:${m.content}`).join("|");
}
function getCached(key) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) { cache.delete(key); return null; }
  return e.data;
}
function setCached(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + TTL_MS });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

function extractContent(data) {
  return data?.choices?.[0]?.message?.content?.trim() ?? "";
}

// ─── Rule-based scoring engine ────────────────────────────────────────────────

function ruleBasedAnalysis(symbol, m = {}) {
  let score = 50;
  const parts = [];

  const pe = m.pe ?? 0;
  if (pe > 0 && pe < 15)       { score += 20; parts.push(`Low P/E ${pe.toFixed(1)}`); }
  else if (pe > 0 && pe <= 25) { score += 10; parts.push(`Moderate P/E ${pe.toFixed(1)}`); }
  else if (pe > 25)            { score  -= 5; parts.push(`High P/E ${pe.toFixed(1)}`); }

  const rev = m.revGrowth ?? 0;
  if (rev > 20)      { score += 25; parts.push(`Strong revenue growth ${rev.toFixed(1)}%`); }
  else if (rev > 10) { score += 12; parts.push(`Moderate revenue growth ${rev.toFixed(1)}%`); }
  else if (rev < 0)  { score -= 15; parts.push(`Declining revenue ${rev.toFixed(1)}%`); }

  const de = m.debtEquity ?? 0;
  if (de < 0.5)    { score += 15; parts.push(`Low debt D/E ${de.toFixed(2)}`); }
  else if (de > 2) { score -= 15; parts.push(`High leverage D/E ${de.toFixed(2)}`); }

  const roe = m.roe ?? 0;
  if (roe > 20)     { score += 10; parts.push(`Strong ROE ${roe.toFixed(1)}%`); }
  else if (roe < 5) { score  -= 8; parts.push(`Weak ROE ${roe.toFixed(1)}%`); }

  const rsi = m.rsi ?? 50;
  if (rsi < 30)      { score += 20; parts.push(`Oversold RSI ${rsi}`); }
  else if (rsi < 40) { score += 12; parts.push(`Mildly oversold RSI ${rsi}`); }
  else if (rsi > 75) { score -= 15; parts.push(`Overbought RSI ${rsi}`); }

  const conv = m.conviction ?? 0;
  if (conv > 0) {
    const d = Math.round((conv - 50) * 0.15);
    score += d;
    parts.push(`Engine conviction ${conv}/100`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const label = score >= 70 ? "Strong Buy" : score >= 55 ? "Buy" : score >= 40 ? "Hold" : "Sell";
  const brief =
    `${symbol} scores ${score}/100 — ${label}. ` +
    (parts.length ? parts.slice(0, 3).join("; ") + ". " : "") +
    "Rule-based estimate — add an optional AI key for narrative analysis.";

  return { score, label, brief, model: "rule-based", provider: "local" };
}

// ─── Providers ────────────────────────────────────────────────────────────────

async function tryPollinations(messages, task) {
  const model = task === "scoring" ? "mistral" : "openai";
  try {
    const res = await withTimeout(
      fetch("https://text.pollinations.ai/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, model, seed: 42 }),
      }),
      TIMEOUT_MS
    );
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return text ? { content: text, model, provider: "pollinations" } : null;
  } catch { return null; }
}

async function tryGroq(messages, maxTokens) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  try {
    const res = await withTimeout(
      fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          max_tokens: maxTokens,
          temperature: 0.3,
        }),
      }),
      TIMEOUT_MS
    );
    if (!res.ok) return null;
    const data = await res.json();
    const content = extractContent(data);
    return content ? { content, model: "llama-3.3-70b-versatile", provider: "groq" } : null;
  } catch { return null; }
}

async function tryGemini(messages, maxTokens) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const systemMsg = messages.find((m) => m.role === "system")?.content ?? "";
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  try {
    const res = await withTimeout(
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: systemMsg ? { parts: [{ text: systemMsg }] } : undefined,
            contents,
            generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
          }),
        }
      ),
      TIMEOUT_MS
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    return text ? { content: text, model: "gemini-2.0-flash", provider: "gemini" } : null;
  } catch { return null; }
}

async function tryOpenRouter(messages, task, maxTokens) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  const model =
    task === "scoring"        ? "deepseek/deepseek-r1:free" :
    task === "classification" ? "mistralai/mistral-7b-instruct:free" :
                                "google/gemini-2.0-flash-exp:free";
  try {
    const res = await withTimeout(
      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          "HTTP-Referer": "https://equityiq.app",
          "X-Title": "EquityIQ",
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.3 }),
      }),
      TIMEOUT_MS
    );
    if (!res.ok) return null;
    const data = await res.json();
    const content = extractContent(data);
    return content ? { content, model, provider: "openrouter" } : null;
  } catch { return null; }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      note: "No API key required. Uses Pollinations AI by default.",
      cacheSize: cache.size,
    });
  }

  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const {
    messages,
    task = "brief",
    max_tokens = 512,
    no_cache = false,
    symbol,
    metrics,
  } = req.body ?? {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ ok: false, error: "messages[] is required." });
  }

  const key = cacheKey(messages, symbol);
  if (!no_cache) {
    const hit = getCached(key);
    if (hit) return res.status(200).json({ ok: true, ...hit, cached: true });
  }

  // Waterfall
  const result =
    (await tryPollinations(messages, task)) ??
    (await tryGroq(messages, max_tokens)) ??
    (await tryGemini(messages, max_tokens)) ??
    (await tryOpenRouter(messages, task, max_tokens)) ??
    (() => {
      const rb = ruleBasedAnalysis(symbol ?? "STOCK", metrics ?? {});
      return { content: rb.brief, model: rb.model, provider: rb.provider };
    })();

  const payload = { ok: true, ...result, cached: false };
  if (!no_cache) setCached(key, payload);
  return res.status(200).json(payload);
}
