/**
 * EquityIQ AI client — zero-key-required provider chain.
 *
 * Provider waterfall (tried in order, next used on any error/timeout):
 *   1. Pollinations AI  — no key, no signup, always tried first
 *   2. Groq             — only if GROQ_API_KEY is set (14,400 req/day free)
 *   3. Gemini           — only if GEMINI_API_KEY is set (1,500 req/day free)
 *   4. OpenRouter       — only if OPENROUTER_API_KEY is set (free models)
 *   5. Rule-based       — pure JS, zero network, always works
 *
 * The app functions fully with NO environment variables set.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiTaskType = "brief" | "scoring" | "classification";

export type AiCompletionResult = {
  content: string;
  model: string;
  provider: string;
  cached: boolean;
};

export type AiCompletionOptions = {
  task?: AiTaskType;
  maxTokens?: number;
  temperature?: number;
  noCache?: boolean;
  /** When set, cache key is `${symbol}-${YYYY-MM-DD}` instead of message hash. */
  symbol?: string;
};

// ─── Cache (2-hour TTL) ───────────────────────────────────────────────────────

const CACHE_TTL_MS = 2 * 60 * 60 * 1000;

type CacheEntry = {
  content: string;
  model: string;
  provider: string;
  expiresAt: number;
};

const _cache = new Map<string, CacheEntry>();

function _todayIST(): string {
  return new Date()
    .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD
}

function _cacheKey(messages: AiMessage[], symbol?: string): string {
  if (symbol) return `${symbol.toUpperCase()}-${_todayIST()}`;
  // Stable hash from message content only (not metadata)
  return messages.map((m) => `${m.role}:${m.content}`).join("|");
}

function _getCached(key: string): CacheEntry | null {
  const e = _cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) { _cache.delete(key); return null; }
  return e;
}

function _setCached(key: string, entry: Omit<CacheEntry, "expiresAt">): void {
  _cache.set(key, { ...entry, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function pruneAiCache(): number {
  const now = Date.now();
  let n = 0;
  for (const [k, e] of _cache) { if (now > e.expiresAt) { _cache.delete(k); n++; } }
  return n;
}

export function getAiCacheSize(): number { return _cache.size; }

// ─── Rule-based fallback engine ───────────────────────────────────────────────

export type StockMetrics = {
  pe?: number | null;
  revGrowth?: number | null;   // YoY %
  debtEquity?: number | null;
  rsi?: number | null;
  roe?: number | null;
  conviction?: number | null;
  riskGrade?: string | null;
};

export type RuleBasedScore = {
  score: number;           // 0–100
  label: "Strong Buy" | "Buy" | "Hold" | "Sell";
  action: "BUY" | "WATCH" | "AVOID";
  components: { name: string; delta: number; reason: string }[];
  brief: string;
};

export function ruleBasedAnalysis(symbol: string, m: StockMetrics): RuleBasedScore {
  let score = 50;
  const components: RuleBasedScore["components"] = [];

  const add = (name: string, delta: number, reason: string) => {
    score += delta;
    components.push({ name, delta, reason });
  };

  // P/E ratio
  const pe = m.pe ?? 0;
  if (pe > 0 && pe < 15)       add("Valuation", +20, `Low P/E ${pe.toFixed(1)} (value territory)`);
  else if (pe > 0 && pe <= 25) add("Valuation", +10, `Moderate P/E ${pe.toFixed(1)}`);
  else if (pe > 25)            add("Valuation",  -5, `High P/E ${pe.toFixed(1)} — premium pricing`);

  // Revenue growth
  const rev = m.revGrowth ?? 0;
  if (rev > 20)      add("Growth", +25, `Strong revenue growth ${rev.toFixed(1)}%`);
  else if (rev > 10) add("Growth", +12, `Moderate revenue growth ${rev.toFixed(1)}%`);
  else if (rev < 0)  add("Growth", -15, `Declining revenue ${rev.toFixed(1)}%`);

  // Debt/Equity
  const de = m.debtEquity ?? 0;
  if (de < 0.5)      add("Quality", +15, `Low debt (D/E ${de.toFixed(2)})`);
  else if (de > 2)   add("Quality", -15, `High leverage (D/E ${de.toFixed(2)})`);
  else if (de > 1)   add("Quality",  -5, `Moderate leverage (D/E ${de.toFixed(2)})`);

  // ROE
  const roe = m.roe ?? 0;
  if (roe > 20)     add("Returns", +10, `Strong ROE ${roe.toFixed(1)}%`);
  else if (roe > 12) add("Returns", +5, `Decent ROE ${roe.toFixed(1)}%`);
  else if (roe < 5)  add("Returns", -8, `Weak ROE ${roe.toFixed(1)}%`);

  // RSI — momentum
  const rsi = m.rsi ?? 50;
  if (rsi < 30)       add("Momentum", +20, `Heavily oversold (RSI ${rsi.toFixed(0)}) — potential reversal`);
  else if (rsi < 40)  add("Momentum", +12, `Oversold (RSI ${rsi.toFixed(0)})`);
  else if (rsi > 75)  add("Momentum", -15, `Overbought (RSI ${rsi.toFixed(0)}) — pullback risk`);
  else if (rsi > 60)  add("Momentum",  -5, `Mildly extended (RSI ${rsi.toFixed(0)})`);

  // Conviction from scoring engine (if available)
  const conv = m.conviction ?? 0;
  if (conv > 0) {
    const delta = Math.round((conv - 50) * 0.15);
    add("Engine", delta, `Conviction score ${conv}/100`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const label: RuleBasedScore["label"] =
    score >= 70 ? "Strong Buy" : score >= 55 ? "Buy" : score >= 40 ? "Hold" : "Sell";
  const action: RuleBasedScore["action"] =
    score >= 65 ? "BUY" : score >= 40 ? "WATCH" : "AVOID";

  const positives = components.filter((c) => c.delta > 0).map((c) => c.reason);
  const negatives = components.filter((c) => c.delta < 0).map((c) => c.reason);

  const brief =
    `${symbol} scores ${score}/100 on rule-based analysis — ${label}. ` +
    (positives.length
      ? `Positives: ${positives.slice(0, 2).join("; ")}. `
      : "") +
    (negatives.length
      ? `Risks: ${negatives.slice(0, 1).join("; ")}. `
      : "") +
    `This is a rule-based estimate — connect a free AI provider for narrative analysis.`;

  return { score, label, action, components, brief };
}

// ─── Provider implementations ─────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 8_000;

function _timeout(ms: number): Promise<never> {
  return new Promise((_, rej) =>
    setTimeout(() => rej(new Error(`Timeout after ${ms}ms`)), ms)
  );
}

async function _withTimeout<T>(p: Promise<T>, ms = FETCH_TIMEOUT_MS): Promise<T> {
  return Promise.race([p, _timeout(ms)]);
}

/** Extract text content from an OpenAI-compatible choices[] response. */
function _extractContent(data: unknown): string {
  const d = data as Record<string, unknown>;
  const choices = d?.choices as { message?: { content?: string } }[] | undefined;
  return choices?.[0]?.message?.content?.trim() ?? "";
}

// 1. Pollinations AI — no key, no signup ──────────────────────────────────────
async function _tryPollinations(
  messages: AiMessage[],
  task: AiTaskType
): Promise<AiCompletionResult | null> {
  // Model selection: brief→openai, scoring→mistral, classification→openai
  const model = task === "scoring" ? "mistral" : "openai";
  try {
    const res = await _withTimeout(
      fetch("https://text.pollinations.ai/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, model, seed: 42 }),
      })
    );
    if (!res.ok) return null;
    // Pollinations returns raw text, not JSON
    const text = (await res.text()).trim();
    if (!text) return null;
    return { content: text, model, provider: "pollinations", cached: false };
  } catch {
    return null;
  }
}

// 2. Groq — free tier, 14,400 req/day, key optional ──────────────────────────
async function _tryGroq(messages: AiMessage[], maxTokens: number): Promise<AiCompletionResult | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  try {
    const res = await _withTimeout(
      fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          max_tokens: maxTokens,
          temperature: 0.3,
        }),
      })
    );
    if (!res.ok) return null;
    const data = await res.json();
    const content = _extractContent(data);
    if (!content) return null;
    return { content, model: "llama-3.3-70b-versatile", provider: "groq", cached: false };
  } catch {
    return null;
  }
}

// 3. Gemini — free tier, 1,500 req/day, key optional ─────────────────────────
async function _tryGemini(messages: AiMessage[], maxTokens: number): Promise<AiCompletionResult | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  // Convert OpenAI messages to Gemini format
  const systemMsg = messages.find((m) => m.role === "system")?.content ?? "";
  const userMsgs = messages.filter((m) => m.role !== "system");
  const contents = userMsgs.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  try {
    const res = await _withTimeout(
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
      )
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    if (!text) return null;
    return { content: text, model: "gemini-2.0-flash", provider: "gemini", cached: false };
  } catch {
    return null;
  }
}

// 4. OpenRouter — free models, key optional ───────────────────────────────────
async function _tryOpenRouter(
  messages: AiMessage[],
  task: AiTaskType,
  maxTokens: number
): Promise<AiCompletionResult | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  const model =
    task === "scoring"        ? "deepseek/deepseek-r1:free" :
    task === "classification" ? "mistralai/mistral-7b-instruct:free" :
                                "google/gemini-2.0-flash-exp:free";
  try {
    const res = await _withTimeout(
      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          "HTTP-Referer": "https://equityiq.app",
          "X-Title": "EquityIQ",
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.3 }),
      })
    );
    if (!res.ok) return null;
    const data = await res.json();
    const content = _extractContent(data);
    if (!content) return null;
    return { content, model, provider: "openrouter", cached: false };
  } catch {
    return null;
  }
}

// 5. Ollama — local only, best-effort ─────────────────────────────────────────
async function _tryOllama(messages: AiMessage[]): Promise<AiCompletionResult | null> {
  try {
    const res = await _withTimeout(
      fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3.2",
          messages,
          stream: false,
        }),
      }),
      5_000 // shorter timeout for local — fail fast if not running
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { message?: { content?: string } };
    const content = data?.message?.content?.trim() ?? "";
    if (!content) return null;
    return { content, model: "llama3.2", provider: "ollama", cached: false };
  } catch {
    return null;
  }
}

// ─── Core: provider waterfall ─────────────────────────────────────────────────

/**
 * Run AI completion through the provider waterfall.
 * Never throws — falls back to rule-based if all providers fail.
 */
export async function aiComplete(
  messages: AiMessage[],
  options: AiCompletionOptions = {},
  fallbackMetrics?: StockMetrics & { symbol?: string }
): Promise<AiCompletionResult> {
  const task = options.task ?? "brief";
  const maxTokens = options.maxTokens ?? 512;
  const key = _cacheKey(messages, options.symbol);

  // Cache read
  if (!options.noCache) {
    const hit = _getCached(key);
    if (hit) return { content: hit.content, model: hit.model, provider: hit.provider, cached: true };
  }

  // Provider waterfall — Pollinations first (no key needed)
  const result =
    (await _tryPollinations(messages, task)) ??
    (await _tryGroq(messages, maxTokens)) ??
    (await _tryGemini(messages, maxTokens)) ??
    (await _tryOpenRouter(messages, task, maxTokens)) ??
    (await _tryOllama(messages)) ??
    null;

  if (result) {
    if (!options.noCache) _setCached(key, result);
    return result;
  }

  // Rule-based fallback — always works, zero network
  const sym = options.symbol ?? fallbackMetrics?.symbol ?? "STOCK";
  const analysis = ruleBasedAnalysis(sym, fallbackMetrics ?? {});
  const fallback: AiCompletionResult = {
    content: analysis.brief,
    model: "rule-based",
    provider: "local",
    cached: false,
  };
  if (!options.noCache) _setCached(key, fallback);
  return fallback;
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

/** Generate a stock brief. Cached by symbol+date (2 h). */
export async function generateStockBrief(
  symbol: string,
  context: string,
  metrics?: StockMetrics,
  noCache = false
): Promise<AiCompletionResult> {
  return aiComplete(
    [
      {
        role: "system",
        content:
          "You are a concise Indian equity research analyst. Respond in 3–4 sentences. Focus on the investment thesis and key risk. Be direct and data-driven.",
      },
      {
        role: "user",
        content: `Write a brief investment summary for ${symbol}. Context: ${context}`,
      },
    ],
    { task: "brief", maxTokens: 256, symbol, noCache },
    { ...metrics, symbol }
  );
}

/** Explain a conviction score breakdown. Cached by symbol+date (2 h). */
export async function explainScore(
  symbol: string,
  breakdown: Record<string, number>,
  metrics?: StockMetrics,
  noCache = false
): Promise<AiCompletionResult> {
  const parts = Object.entries(breakdown)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  return aiComplete(
    [
      {
        role: "system",
        content:
          "You are a quantitative equity analyst. Explain score components in 2–3 sentences. Be precise.",
      },
      {
        role: "user",
        content: `Explain the conviction score for ${symbol}. Components: ${parts}. What drives the score and what is the main weakness?`,
      },
    ],
    { task: "scoring", maxTokens: 256, symbol, noCache },
    { ...metrics, symbol }
  );
}

/** Classify BUY / WATCH / AVOID — rule-based first, AI-enhanced if available. */
export async function classifyAction(
  conviction: number,
  confidence: number,
  riskGrade: string,
  noCache = false
): Promise<"BUY" | "WATCH" | "AVOID"> {
  // Rule-based is reliable enough for classification — skip AI to save quota.
  if (conviction >= 65) return "BUY";
  if (conviction >= 40) return "WATCH";

  // Borderline case — ask AI to confirm
  const result = await aiComplete(
    [
      {
        role: "system",
        content: "You classify stocks. Respond with exactly one word: BUY, WATCH, or AVOID.",
      },
      {
        role: "user",
        content: `Conviction: ${conviction}/100. Confidence: ${confidence}%. Risk: ${riskGrade}. Classify.`,
      },
    ],
    { task: "classification", maxTokens: 5, temperature: 0, noCache }
  );

  const w = result.content.trim().toUpperCase();
  if (w === "BUY" || w === "WATCH" || w === "AVOID") return w;
  return conviction >= 40 ? "WATCH" : "AVOID";
}

// Re-export legacy names so existing callers don't break
export const AI_MODELS = {
  fast: "google/gemini-2.0-flash-exp:free",
  reasoning: "deepseek/deepseek-r1:free",
  classify: "mistralai/mistral-7b-instruct:free",
} as const;

export type AiTaskType_ = AiTaskType; // alias kept for backwards compat
