/**
 * BRO AI Worker v1.0.1 — security and reliability patch
 * Free-first routing, bounded requests, token-scoped rate limiting.
 */
const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

const PERSONAS = { chatgpt: "chatgpt", claude: "claude", gemini: "gemini", deepseek: "deepseek", auto: "auto" };
const DEFAULTS = {
  GEMINI_MODEL: "gemini-2.5-flash",
  OPENROUTER_MODEL: "openrouter/free",
  GROQ_MODEL: "openai/gpt-oss-20b",
  OPENAI_MODEL: "gpt-4o-mini",
  ANTHROPIC_MODEL: "claude-3-5-haiku-latest",
  DEEPSEEK_MODEL: "deepseek-chat",
};
const MAX_BODY_BYTES = 64 * 1024;
const MAX_MESSAGE_CHARS = 12000;
const MAX_SYSTEM_CHARS = 7000;
const MAX_HISTORY_ITEMS = 16;
const MAX_HISTORY_ITEM_CHARS = 3000;
const PROVIDER_TIMEOUT_MS = 25000;

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: Object.assign({}, JSON_HEADERS, headers || {}) });
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = String(env.BRO_ALLOWED_ORIGIN || "").split(",").map((x) => x.trim()).filter(Boolean);
  const headers = {
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
  if (origin && allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function bearerToken(request) {
  const header = request.headers.get("Authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function authorized(request, env) {
  return safeEqual(bearerToken(request), String(env.BRO_ACCESS_TOKEN || ""));
}

async function rateLimitKey(request) {
  const token = bearerToken(request);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return "token:" + Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function clean(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max || 12000) : "";
}

function paidEnabled(env) {
  return String(env.BRO_ALLOW_PAID || "").trim() === "1";
}

function historyFrom(value) {
  if (!Array.isArray(value)) return [];
  return value.map((m) => ({
    role: m.role,
    content: m.content.trim(),
  })).filter((m) => m.content);
}

function availableProviders(env) {
  return {
    gemini: Boolean(env.GEMINI_API_KEY),
    openrouter: Boolean(env.OPENROUTER_API_KEY),
    groq: Boolean(env.GROQ_API_KEY && String(env.GROQ_ENABLE || "") === "1"),
    openai: Boolean(paidEnabled(env) && env.OPENAI_API_KEY),
    anthropic: Boolean(paidEnabled(env) && env.ANTHROPIC_API_KEY),
    deepseek: Boolean(paidEnabled(env) && env.DEEPSEEK_API_KEY),
  };
}

function candidates(persona, env) {
  const available = availableProviders(env);
  const list = [];
  if (paidEnabled(env)) {
    const preferred = { chatgpt: "openai", claude: "anthropic", deepseek: "deepseek" }[persona];
    if (preferred && available[preferred]) list.push(preferred);
  }
  if (available.gemini) list.push("gemini");
  if (available.openrouter) list.push("openrouter");
  if (available.groq) list.push("groq");
  return Array.from(new Set(list));
}

function modelFor(provider, env) {
  const key = provider.toUpperCase() + "_MODEL";
  return clean(env[key], 160) || DEFAULTS[key] || "";
}

async function fetchTimed(url, init, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms || PROVIDER_TIMEOUT_MS);
  try {
    return await fetch(url, Object.assign({}, init, { signal: controller.signal }));
  } finally {
    clearTimeout(timer);
  }
}

function messagesFor(body) {
  return body.history.concat([{ role: "user", content: body.message }]);
}

async function callGemini(body, env) {
  const model = modelFor("gemini", env);
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent";
  const contents = messagesFor(body).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const response = await fetchTimed(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: body.system }] },
      contents,
      generationConfig: { maxOutputTokens: 3000, temperature: 0.65 },
    }),
  });
  return parseProvider(response, "gemini", model);
}

async function callOpenAICompatible(provider, body, env) {
  const cfg = {
    openrouter: {
      key: env.OPENROUTER_API_KEY,
      url: "https://openrouter.ai/api/v1/chat/completions",
      model: modelFor("openrouter", env),
      extra: { "HTTP-Referer": "https://sapammeded.github.io/bro_ai/", "X-Title": "BRO AI" },
    },
    groq: { key: env.GROQ_API_KEY, url: "https://api.groq.com/openai/v1/chat/completions", model: modelFor("groq", env), extra: {} },
    openai: { key: env.OPENAI_API_KEY, url: "https://api.openai.com/v1/chat/completions", model: modelFor("openai", env), extra: {} },
    deepseek: { key: env.DEEPSEEK_API_KEY, url: "https://api.deepseek.com/chat/completions", model: modelFor("deepseek", env), extra: {} },
  }[provider];

  const response = await fetchTimed(cfg.url, {
    method: "POST",
    headers: Object.assign({ "Content-Type": "application/json", Authorization: "Bearer " + cfg.key }, cfg.extra),
    body: JSON.stringify({
      model: cfg.model,
      messages: [{ role: "system", content: body.system }].concat(messagesFor(body)),
      max_tokens: 3000,
      temperature: 0.65,
    }),
  });
  return parseProvider(response, provider, cfg.model);
}

async function callAnthropic(body, env) {
  const model = modelFor("anthropic", env);
  const response = await fetchTimed("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 3000, system: body.system, messages: messagesFor(body) }),
  });
  return parseProvider(response, "anthropic", model);
}

async function parseProvider(response, provider, model) {
  const raw = await response.text();
  let data = {};
  try { data = JSON.parse(raw); } catch (_) {}
  if (!response.ok) {
    const error = new Error("Upstream provider request failed.");
    error.status = response.status;
    throw error;
  }
  let reply = "";
  if (provider === "gemini") {
    reply = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts || [])
      .map((p) => p.text || "").join("\n");
  } else if (provider === "anthropic") {
    reply = (data.content || []).filter((p) => p.type === "text").map((p) => p.text || "").join("\n");
  } else {
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    reply = typeof content === "string" ? content : Array.isArray(content) ? content.map((p) => p.text || "").join("\n") : "";
  }
  if (!reply.trim()) {
    const error = new Error("Provider returned an empty or unsupported response.");
    error.status = 502;
    throw error;
  }
  return { reply: reply.trim().slice(0, 40000), provider, model: data.model || model };
}

async function runProvider(provider, body, env) {
  if (provider === "gemini") return callGemini(body, env);
  if (provider === "anthropic") return callAnthropic(body, env);
  return callOpenAICompatible(provider, body, env);
}

function shouldFallback(error) {
  const status = Number(error && error.status || 0);
  return !status || status === 401 || status === 403 || status === 404 || status === 408 || status === 429 || status >= 500;
}

function validateChatBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "Body harus berupa objek JSON.";
  if (typeof body.message !== "string" || !body.message.trim()) return "Pesan tidak boleh kosong.";
  if (body.message.length > MAX_MESSAGE_CHARS) return "Pesan terlalu panjang (maksimal 12.000 karakter).";
  if (body.system !== undefined && (typeof body.system !== "string" || body.system.length > MAX_SYSTEM_CHARS)) return "Instruksi sistem tidak valid atau terlalu panjang.";
  if (body.history !== undefined && !Array.isArray(body.history)) return "Riwayat percakapan harus berupa array.";
  if (Array.isArray(body.history)) {
    if (body.history.length > MAX_HISTORY_ITEMS) return "Riwayat terlalu panjang (maksimal 16 pesan).";
    for (const item of body.history) {
      if (!item || typeof item !== "object" || !["user", "assistant"].includes(item.role) ||
          typeof item.content !== "string" || item.content.length > MAX_HISTORY_ITEM_CHARS) {
        return "Format riwayat percakapan tidak valid.";
      }
    }
  }
  return "";
}

async function readJsonLimited(request) {
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared > MAX_BODY_BYTES) return { tooLarge: true };
  if (!request.body) return { invalid: true };
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return { tooLarge: true };
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return { body: JSON.parse(new TextDecoder().decode(bytes)) }; }
  catch (_) { return { invalid: true }; }
}

async function chat(body, env) {
  const persona = PERSONAS[clean(body.provider, 24).toLowerCase()];
  if (!persona) return { error: "Persona/provider tidak dikenal.", status: 400 };
  const invalid = validateChatBody(body);
  if (invalid) return { error: invalid, status: 400 };
  const message = clean(body.message, MAX_MESSAGE_CHARS);
  const system = clean(body.system, MAX_SYSTEM_CHARS) ||
    "Kamu BRO AI, asisten pribadi yang jujur, teliti, dan membantu dalam bahasa Indonesia. Jangan mengaku telah melakukan tindakan yang belum dijalankan oleh tool.";
  const normalized = { message, system, history: historyFrom(body.history || []) };
  const chain = candidates(persona, env);
  if (!chain.length) {
    return { error: "Belum ada provider AI yang siap. Isi GEMINI_API_KEY atau OPENROUTER_API_KEY di Worker Secrets. Provider berbayar memerlukan BRO_ALLOW_PAID=1.", status: 503 };
  }
  const failures = [];
  for (let i = 0; i < chain.length; i++) {
    const provider = chain[i];
    try {
      const result = await runProvider(provider, normalized, env);
      return { ok: true, persona, provider: result.provider, model: result.model, reply: result.reply, fallbackUsed: i > 0 };
    } catch (error) {
      failures.push({ provider, status: Number(error && error.status || 0) });
      if (!shouldFallback(error)) break;
    }
  }
  const last = failures[failures.length - 1];
  return {
    error: "Semua provider yang tersedia gagal. Periksa konfigurasi provider atau coba lagi nanti.",
    status: last && last.status >= 400 && last.status < 500 ? last.status : 502,
    failures,
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = corsHeaders(request, env);
    const origin = request.headers.get("Origin");

    if (origin && !headers["Access-Control-Allow-Origin"]) {
      return json({ ok: false, error: "Origin tidak diizinkan. Atur BRO_ALLOWED_ORIGIN dengan origin frontend yang tepat." }, 403, headers);
    }

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

    if (url.pathname === "/health" || url.pathname.endsWith("/health")) {
      if (request.method !== "GET") return json({ ok: false, error: "Gunakan GET untuk health check." }, 405, headers);
      if (!authorized(request, env)) return json({ ok: false, error: "Token akses tidak valid." }, 401, headers);
      return json({
        ok: true,
        service: "BRO AI Multi-Provider Worker",
        version: "1.0.1",
        providers: availableProviders(env),
        paidEnabled: paidEnabled(env),
        freeFirst: true,
        rateLimitConfigured: Boolean(env.BRO_CHAT_LIMITER),
        rateLimit: "20 requests per 60 seconds per access token; approximate per Cloudflare location",
        maxRequestBytes: MAX_BODY_BYTES,
        maxHistoryMessages: MAX_HISTORY_ITEMS,
        providerTimeoutMs: PROVIDER_TIMEOUT_MS,
        voice: "Browser Web Speech API (client-side)",
        memory: "Local device until optional D1 integration is configured",
        actions: "Approval-gated client tools; no unrestricted server execution",
      }, 200, headers);
    }

    if (url.pathname === "/chat" || url.pathname.endsWith("/chat")) {
      if (request.method !== "POST") return json({ ok: false, error: "Gunakan POST untuk chat." }, 405, headers);
      if (!authorized(request, env)) return json({ ok: false, error: "Token akses tidak valid atau belum dikonfigurasi." }, 401, headers);
      if (!env.BRO_CHAT_LIMITER || typeof env.BRO_CHAT_LIMITER.limit !== "function") {
        return json({ ok: false, error: "Rate limiter belum dikonfigurasi. Aktifkan BRO_CHAT_LIMITER di Cloudflare Worker." }, 503, headers);
      }
      try {
        const decision = await env.BRO_CHAT_LIMITER.limit({ key: await rateLimitKey(request) });
        if (!decision || decision.success !== true) {
          return json({ ok: false, error: "Batas penggunaan tercapai. Coba lagi sekitar satu menit lagi." }, 429, Object.assign({}, headers, { "Retry-After": "60" }));
        }
      } catch (_) {
        return json({ ok: false, error: "Pemeriksaan batas penggunaan gagal. Permintaan dihentikan demi keamanan." }, 503, headers);
      }
      const parsed = await readJsonLimited(request);
      if (parsed.tooLarge) return json({ ok: false, error: "Ukuran request melebihi batas 64 KB." }, 413, headers);
      if (parsed.invalid) return json({ ok: false, error: "Body JSON tidak valid." }, 400, headers);
      const result = await chat(parsed.body || {}, env);
      if (!result.ok) return json({ ok: false, error: result.error, failures: result.failures || [] }, result.status || 502, headers);
      return json(result, 200, headers);
    }

    return json({ ok: false, error: "Endpoint tidak ditemukan. Gunakan /health atau /chat." }, 404, headers);
  },
};
